import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentTenant } from '../../services/dataService';
import TenantApplicationStatusCard from '../../components/tenant/TenantApplicationStatusCard';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useTheme } from '../../utils/ThemeContext';
import { cardStyle, fs, getResponsivePadding, isDesktop, isMobile } from '../../utils/responsive';

export default function TenantApplicationScreen({ user }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const tenantId = user?.tenant_id;
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedOnce = useRef(false);

  const loadTenant = useCallback(async () => {
    if (!tenantId) {
      setError('Your tenant profile is not linked to this account. Please sign in again or contact the property manager.');
      setLoading(false);
      return;
    }
    try {
      setError('');
      setTenant(await getCurrentTenant(tenantId));
    } catch (loadError) {
      setError('Could not load your application. Please try again.');
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [tenantId]);

  useRealtimeRefresh(`tenant-application-${tenantId || 'unknown'}`, [
    { table: 'tenants', filter: `id=eq.${tenantId || ''}` },
    { table: 'room_assignment_requests', filter: `tenant_id=eq.${tenantId || ''}` },
    { table: 'payment_proofs', filter: `tenant_id=eq.${tenantId || ''}` },
  ], () => setRefreshKey((key) => key + 1), Boolean(tenantId));

  useEffect(() => {
    if (!hasLoadedOnce.current) setLoading(true);
    loadTenant();
  }, [loadTenant, refreshKey]);

  const retry = () => {
    setLoading(true);
    loadTenant();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: padding, paddingTop: isMobile ? 18 : 36, paddingBottom: 32, alignItems: isDesktop ? 'center' : 'stretch' }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: '100%', maxWidth: 850 }}>
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: fs(12), fontWeight: '800', letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase' }}>TENANT PORTAL</Text>
          <Text style={{ fontSize: fs(27), color: colors.text, fontWeight: '900', marginTop: 4 }}>Your application</Text>
          <Text style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 21, marginTop: 6 }}>
            Check your review status and manage your room and move-in payment details here.
          </Text>
        </View>

        {loading ? (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 28, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.textMuted, fontSize: fs(13), marginTop: 10 }}>Loading application…</Text>
          </View>
        ) : error || !tenant ? (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 22, alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={34} color={colors.dangerText} />
            <Text style={{ color: colors.dangerText, fontSize: fs(14), textAlign: 'center', marginTop: 10 }}>{error || 'Your application is unavailable.'}</Text>
            <TouchableOpacity onPress={retry} accessibilityRole="button" style={{ marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.accent }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TenantApplicationStatusCard
            tenant={tenant}
            tenantId={tenantId}
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((key) => key + 1)}
          />
        )}
      </View>
    </ScrollView>
  );
}
