import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getMonthlyIncome, getPeriodSummary } from '../../services/dataService';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const shiftPeriod = (period, amount) => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatPeriod = (period) => new Date(`${period}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function OwnerReports() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyIncome, setMonthlyIncome] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod);
  const [realtimeVersion, setRealtimeVersion] = useState(0);

  useRealtimeRefresh('landlord-reports', [
    { table: 'rooms' },
    { table: 'tenants' },
    { table: 'leases' },
    { table: 'invoices' },
    { table: 'payments' },
    { table: 'complaints' },
    { table: 'utility_readings' },
  ], () => setRealtimeVersion((version) => version + 1));

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const monthlyIncomeData = await getMonthlyIncome(selectedPeriod);
        const summaryData = await getPeriodSummary(selectedPeriod);

        setMonthlyIncome(monthlyIncomeData);
        setSummary(summaryData);
      } catch (err) {
        setError('Failed to load reports data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedPeriod, realtimeVersion]);

  if (loading) return <ScreenSkeleton />;
  if (error) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={{ color: colors.danger, fontSize: 16 }}>{error}</Text></View>;

  // Chart calculations
  const maxAmount = Math.max(1, ...monthlyIncome.map((m) => m.amount));
  const maxBarHeight = isMobile ? 120 : 160;
  const currentMonthIndex = monthlyIncome.length - 1; // Last month is current

  // Summary items with color coding
  const summaryItems = [
    { label: 'Cash Received', value: `₱${summary.cashReceived.toLocaleString()}`, color: colors.success },
    { label: 'Rent Billed', value: `₱${summary.rentBilled.toLocaleString()}`, color: colors.text },
    { label: 'Unpaid Balance', value: `₱${summary.unpaidBalance.toLocaleString()}`, color: colors.danger },
    { label: 'Electricity Billed', value: `₱${summary.electricityFees.toLocaleString()}`, color: colors.warning },
    { label: 'Occupied Rooms (current)', value: `${summary.occupiedRooms} / ${summary.totalRooms}`, color: colors.text },
    { label: 'New Complaints', value: `${summary.newComplaints}`, color: colors.warning },
    { label: 'Resolved', value: `${summary.resolved}`, color: colors.success },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 20,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ padding, paddingTop: isMobile ? 16 : isDesktop ? 28 : 24, paddingBottom: 16 }}>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 5 }}>OWNER PORTAL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '900', letterSpacing: -0.5 }}>Reports</Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 21, marginTop: 5 }}>Income and property performance at a glance.</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.ownerAccentBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="bar-chart-outline" size={22} color={colors.ownerAccent} />
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, paddingHorizontal: 14, paddingVertical: 10 }}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setSelectedPeriod((period) => shiftPeriod(period, -1))} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: fs(10), color: colors.textMuted, fontWeight: '700', letterSpacing: 1 }}>VIEWING MONTH</Text>
                <Text style={{ fontSize: fs(15), color: colors.text, fontWeight: '800', marginTop: 3 }}>{formatPeriod(selectedPeriod)}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setSelectedPeriod((period) => shiftPeriod(period, 1))} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* ── Monthly Income Bar Chart ────────────── */}
            <View style={{
              ...cardStyle,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              padding: isMobile ? 20 : 28,
            }}>
              <Text style={{
                fontSize: fs(10),
                fontWeight: '800',
                color: colors.textSecondary,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 24,
              }}>
                Cash Received (₱)
              </Text>

              {/* Bar chart */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: maxBarHeight + 30,
                gap: isMobile ? 8 : 16,
              }}>
                {monthlyIncome.map((item, index) => {
                  const barHeight = (item.amount / maxAmount) * maxBarHeight;
                  const isCurrent = index === currentMonthIndex;
                  const amountLabel = item.amount >= 1000
                    ? `${(item.amount / 1000).toLocaleString('en-PH', { maximumFractionDigits: 1 })}k`
                    : Math.round(item.amount).toLocaleString('en-PH');

                  return (
                    <View
                      key={item.month}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      {/* Amount label above bar */}
                      <Text style={{
                        fontSize: fs(10),
                        fontWeight: '700',
                        color: isCurrent ? colors.ownerAccent : colors.textMuted,
                        marginBottom: 6,
                      }}>
                        {amountLabel}
                      </Text>

                      {/* Bar */}
                      <View style={{
                        width: '100%',
                        maxWidth: isMobile ? 40 : 56,
                        height: barHeight,
                        borderRadius: 8,
                        backgroundColor: isCurrent ? colors.ownerBarHighlight : colors.ownerBarDefault,
                        ...(isCurrent ? {
                          // Subtle glow for current month
                          ...cardShadow,
                        } : {}),
                      }} />

                      {/* Month label */}
                      <Text style={{
                        fontSize: fs(10),
                        fontWeight: '600',
                        color: isCurrent ? colors.ownerAccent : colors.textMuted,
                        marginTop: 8,
                      }}>
                        {item.month}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── September Summary ───────────────────── */}
            <View>
              <Text style={{
                fontSize: fs(11),
                fontWeight: '800',
                color: colors.textSecondary,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
              {formatPeriod(selectedPeriod)} summary
              </Text>

              <View style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                overflow: 'hidden',
              }}>
                {summaryItems.map((item, index) => (
                  <View
                    key={item.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: isMobile ? 16 : 20,
                      paddingVertical: isMobile ? 14 : 16,
                      borderBottomWidth: index < summaryItems.length - 1 ? 1 : 0,
                      borderBottomColor: colors.divider,
                    }}
                  >
                    <Text style={{
                      fontSize: fs(14),
                      fontWeight: '500',
                      color: colors.textSecondary,
                    }}>
                      {item.label}
                    </Text>
                    <Text style={{
                      fontSize: fs(15),
                      fontWeight: '800',
                      color: item.color,
                      fontVariant: ['tabular-nums'],
                    }}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

