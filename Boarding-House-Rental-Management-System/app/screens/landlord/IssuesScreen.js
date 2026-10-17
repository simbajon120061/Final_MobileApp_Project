import ScreenSkeleton from '../../components/ScreenSkeleton';
import TenantListPager from '../../components/landlord/TenantListPager';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  isMobile,
  isTablet,
  isDesktop,
  getResponsivePadding,
  fs,
  spacing,
  cardStyle,
  cardShadow,
  safeAreaTop,
} from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getIssues, updateComplaintStatus } from '../../services/dataService';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

export default function IssuesScreen() {
  const complaintsPerPage = 4;
  const { colors } = useTheme();
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const loadIssues = async () => {
    try {
      setError(null);
      const data = await getIssues();
      setIssues(data);
    } catch (err) {
      setError('Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  useRealtimeRefresh('landlord-complaints', [{ table: 'complaints' }], loadIssues);

  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      setUpdatingId(complaintId);
      await updateComplaintStatus(complaintId, newStatus);
      // Update local state
      setIssues((prev) =>
        prev.map((item) =>
          item.complaint_id === complaintId || item.id === complaintId
            ? { ...item, status: newStatus }
            : item
        )
      );
    } catch (err) {
      alert('Could not update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = issues.filter((i) => i.status === 'pending').length;
  const inProgressCount = issues.filter((i) => i.status === 'in-progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;

  const filterOptions = [
    { key: 'All', count: issues.length, bg: colors.accent, text: '#ffffff', border: colors.accent },
    { key: 'Pending', count: pendingCount, bg: colors.warningBg, text: colors.warningText, border: colors.warning },
    { key: 'In Progress', count: inProgressCount, bg: colors.infoBg, text: colors.infoText, border: colors.info },
    { key: 'Resolved', count: resolvedCount, bg: colors.successBg, text: colors.successText, border: colors.success },
  ];

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return issue.status === 'pending';
    if (filter === 'In Progress') return issue.status === 'in-progress';
    if (filter === 'Resolved') return issue.status === 'resolved';
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filteredIssues.length / complaintsPerPage));
  const visibleIssues = filteredIssues.slice(page * complaintsPerPage, (page + 1) * complaintsPerPage);
  const selectedComplaint = issues.find((issue) => issue.complaint_id === selectedComplaintId) || null;

  useEffect(() => {
    setPage(0);
  }, [filter]);

  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const getStatusBorderColor = (status) => {
    if (status === 'pending') return colors.warning;
    if (status === 'in-progress') return colors.info;
    if (status === 'resolved') return colors.success;
    return colors.cardBorder;
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') {
      return { bg: colors.warningBg, text: colors.warningText, dot: colors.warning, label: 'pending' };
    }
    if (status === 'in-progress') {
      return { bg: colors.infoBg, text: colors.infoText, dot: colors.info, label: 'in-progress' };
    }
    if (status === 'resolved') {
      return { bg: colors.successBg, text: colors.successText, dot: colors.success, label: 'resolved' };
    }
    return { bg: colors.cardBorder, text: colors.textMuted, dot: colors.textMuted, label: status };
  };

  if (loading) return <ScreenSkeleton />;

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: padding,
          paddingTop: isMobile ? 16 : isDesktop ? 40 : 60,
          paddingBottom: spacing.sm,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '500' }}>
            {issues.length} total
          </Text>
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700', marginTop: 4 }}>
            Complaints
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginTop: spacing.md,
              paddingBottom: 4,
            }}
          >
            {filterOptions.map((option) => {
              const isActive = filter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.7}
                  onPress={() => setFilter(option.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: isDesktop ? 18 : 14,
                    paddingVertical: isDesktop ? 10 : 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? colors.accent : option.bg,
                    borderWidth: 1,
                    borderColor: isActive ? colors.accent : option.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fs(13),
                      fontWeight: '700',
                      color: isActive ? '#ffffff' : option.text,
                    }}
                  >
                    {option.key} ({option.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingTop: spacing.sm,
          paddingBottom: 20,
          gap: spacing.lg,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%', gap: spacing.lg }}>
          {/* Section Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: fs(13),
                fontWeight: '700',
                color: colors.textSecondary,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {filter === 'All' ? 'All Complaints' : `${filter} Complaints`} ({filteredIssues.length})
            </Text>
          </View>

          {/* Issues List */}
          {visibleIssues.map((issue) => {
            const statusBadge = getStatusBadge(issue.status);
            const isUpdating = updatingId === issue.complaint_id;

            return (
              <View
                key={issue.id}
                style={{
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: isDesktop ? 24 : 18,
                  borderLeftWidth: 3,
                  borderLeftColor: getStatusBorderColor(issue.status),
                }}
              >
                {/* Header: Title and Status Badge */}
                <View
                  style={{
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fs(16),
                      fontWeight: '700',
                      color: colors.text,
                      flex: 1,
                    }}
                    numberOfLines={2}
                  >
                    <Text style={{ fontWeight: '500', color: colors.warningText }}>Complaint:</Text> {issue.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: statusBadge.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      alignSelf: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: statusBadge.dot,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: fs(11),
                        fontWeight: '700',
                        color: statusBadge.text,
                        textTransform: 'capitalize',
                      }}
                    >
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Tenant Info */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: issue.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#ffffff' }}>
                      {issue.initials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}
                      numberOfLines={1}
                    >
                      {issue.tenant}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Ionicons name="business-outline" size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted }}>
                        {issue.room}
                      </Text>
                      <Text style={{ fontSize: fs(12), color: colors.textMuted }}>•</Text>
                      <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted }}>
                        {issue.date}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Complaint Actions */}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {issue.status !== 'resolved' ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={isUpdating}
                      onPress={() => handleUpdateStatus(issue.complaint_id, 'resolved')}
                      style={{
                        flex: 1,
                        backgroundColor: colors.successText,
                        paddingVertical: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        minHeight: 46,
                        opacity: isUpdating ? 0.6 : 1,
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#ffffff' }}>
                        Mark Resolved
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{
                      flex: 1,
                      backgroundColor: colors.successBg,
                      borderWidth: 1,
                      borderColor: colors.success,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}>
                      <Ionicons name="checkmark-done" size={18} color={colors.success} />
                      <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.success }}>Resolved</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    onPress={() => setSelectedComplaintId(issue.complaint_id)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary }}>View details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Empty State */}
          {filteredIssues.length === 0 && (
            <View
              style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                padding: spacing.xl,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.accentBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.md,
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.accent} />
              </View>
              <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>
                No {filter.toLowerCase()} issues
              </Text>
              <Text
                style={{
                  fontSize: fs(13),
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginTop: 6,
                }}
              >
                There are no complaints matching the selected filter.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {filteredIssues.length > 0 && (
        <View style={{
          backgroundColor: colors.bg,
          paddingHorizontal: padding,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          alignItems: 'center',
        }}>
          <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
            <TenantListPager
              page={page}
              pageSize={complaintsPerPage}
              totalCount={filteredIssues.length}
              onPageChange={setPage}
              colors={colors}
            />
          </View>
        </View>
      )}

      <Modal
        visible={Boolean(selectedComplaint)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedComplaintId(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 18 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close complaint details"
            onPress={() => setSelectedComplaintId(null)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          {selectedComplaint && (() => {
            const detailStatus = getStatusBadge(selectedComplaint.status);
            const isUpdatingSelected = updatingId === selectedComplaint.complaint_id;

            return (
              <View style={{ width: '100%', maxWidth: 460, maxHeight: '90%', backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ fontSize: fs(19), fontWeight: '800', color: colors.text }}>Complaint details</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      onPress={() => setSelectedComplaintId(null)}
                      style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="close" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.bg, borderRadius: 13, padding: 12, marginBottom: 14 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: selectedComplaint.color, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: fs(13), fontWeight: '800', color: '#ffffff' }}>{selectedComplaint.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>{selectedComplaint.tenant}</Text>
                      <Text style={{ fontSize: fs(12), color: colors.textSecondary, marginTop: 3 }}>{selectedComplaint.room} · {selectedComplaint.date}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>Complaint title</Text>
                  <View style={{ minHeight: 46, justifyContent: 'center', backgroundColor: colors.bg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 }}>
                    <Text style={{ fontSize: fs(14), color: colors.text, lineHeight: 20 }}>{selectedComplaint.title}</Text>
                  </View>

                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>Details</Text>
                  <View style={{ minHeight: 96, backgroundColor: colors.bg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 }}>
                    <Text style={{ fontSize: fs(14), color: colors.text, lineHeight: 21 }}>
                      {selectedComplaint.description?.trim() || 'No additional details provided.'}
                    </Text>
                  </View>

                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>Status</Text>
                  <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: detailStatus.bg, borderColor: detailStatus.dot, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 18 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: detailStatus.dot }} />
                    <Text style={{ fontSize: fs(13), fontWeight: '700', color: detailStatus.text, textTransform: 'capitalize' }}>{detailStatus.label}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => setSelectedComplaintId(null)}
                      style={{ flex: 1, minHeight: 46, borderRadius: 11, backgroundColor: colors.dangerText, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#fff' }}>Close</Text>
                    </TouchableOpacity>
                    {selectedComplaint.status === 'pending' ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={isUpdatingSelected}
                        onPress={() => handleUpdateStatus(selectedComplaint.complaint_id, 'in-progress')}
                        style={{ flex: 1, minHeight: 46, borderRadius: 11, backgroundColor: colors.info, alignItems: 'center', justifyContent: 'center', opacity: isUpdatingSelected ? 0.6 : 1 }}
                      >
                        {isUpdatingSelected ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#ffffff' }}>In Progress</Text>}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

