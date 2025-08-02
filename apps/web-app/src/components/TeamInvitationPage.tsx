import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Mail,
  Crown,
  Shield,
  Edit,
  Eye,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { TeamRole } from '@almus/shared-types';

interface InvitationDetails {
  teamName: string;
  inviterName: string;
  role: TeamRole;
  message?: string;
  expiresAt: Date;
  isExpired: boolean;
}

const roleIcons = {
  [TeamRole.OWNER]: Crown,
  [TeamRole.ADMIN]: Shield,
  [TeamRole.EDITOR]: Edit,
  [TeamRole.VIEWER]: Eye,
};

const roleColors = {
  [TeamRole.OWNER]:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [TeamRole.ADMIN]:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [TeamRole.EDITOR]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [TeamRole.VIEWER]:
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const roleLabels = {
  [TeamRole.OWNER]: '소유자',
  [TeamRole.ADMIN]: '관리자',
  [TeamRole.EDITOR]: '편집자',
  [TeamRole.VIEWER]: '보기 전용',
};

const roleDescriptions = {
  [TeamRole.OWNER]: '팀의 모든 권한을 가지며, 팀을 관리할 수 있습니다.',
  [TeamRole.ADMIN]: '팀 설정과 멤버를 관리할 수 있습니다.',
  [TeamRole.EDITOR]: '작업을 생성, 수정, 삭제할 수 있습니다.',
  [TeamRole.VIEWER]: '작업을 보고 댓글을 달 수 있습니다.',
};

export const TeamInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'expired' | 'invalid';
    message: string;
    teamName?: string;
  } | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setResult({
        type: 'invalid',
        message: '유효하지 않은 초대 링크입니다.',
      });
      setLoading(false);
      return;
    }

    const loadInvitationDetails = async () => {
      try {
        // Supabase에서 초대 정보 조회
        const { data, error } = await supabase.rpc('get_invitation_details', {
          invitation_token: token,
        });

        if (error) throw error;

        if (!data) {
          setResult({
            type: 'invalid',
            message: '유효하지 않은 초대 링크입니다.',
          });
          setLoading(false);
          return;
        }

        const invitationData: InvitationDetails = {
          teamName: data.team_name,
          inviterName: data.inviter_name,
          role: data.role as TeamRole,
          message: data.message,
          expiresAt: new Date(data.expires_at),
          isExpired: new Date(data.expires_at) < new Date(),
        };

        setInvitation(invitationData);
      } catch (error) {
        logger.error('Failed to load invitation:', error);
        setResult({
          type: 'error',
          message: '초대 정보를 불러오는 중 오류가 발생했습니다.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvitationDetails();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!user || !token) return;

    setProcessing(true);
    try {
      // Supabase RPC call to accept team invitation
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        invitation_token: token,
        user_id: user.uid,
      });

      if (error) throw error;

      setResult({
        type: 'success',
        message: '팀 초대를 수락했습니다!',
        teamName: data?.team_name || invitation?.teamName,
      });

      // 3초 후 홈으로 리다이렉트
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      // Error handling below
      const errorMessage = (error as Error).message;

      if (
        errorMessage.includes('expired') ||
        errorMessage.includes('invalid')
      ) {
        setResult({
          type: 'expired',
          message: '초대장이 만료되었거나 유효하지 않습니다.',
        });
      } else {
        setResult({
          type: 'error',
          message: errorMessage || '초대 수락 중 오류가 발생했습니다.',
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectInvitation = async () => {
    if (!user || !token) return;

    if (!window.confirm('정말로 팀 초대를 거절하시겠습니까?')) return;

    setProcessing(true);
    try {
      // Supabase RPC call to reject team invitation
      const { error } = await supabase.rpc('reject_team_invitation', {
        invitation_token: token,
        user_id: user.uid,
      });

      if (error) throw error;

      setResult({
        type: 'success',
        message: '팀 초대를 거절했습니다.',
      });

      // 3초 후 홈으로 리다이렉트
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      // Error handling below
      setResult({
        type: 'error',
        message:
          (error as Error).message || '초대 거절 중 오류가 발생했습니다.',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            초대장을 확인하는 중...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Mail size={64} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            로그인이 필요합니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            팀 초대를 수락하려면 먼저 로그인해주세요.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const icons = {
      success: CheckCircle,
      error: XCircle,
      expired: Clock,
      invalid: XCircle,
    };

    const colors = {
      success: 'text-green-600',
      error: 'text-red-600',
      expired: 'text-orange-600',
      invalid: 'text-red-600',
    };

    const Icon = icons[result.type];

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Icon size={64} className={`mx-auto mb-4 ${colors[result.type]}`} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {result.type === 'success'
              ? '완료!'
              : result.type === 'expired'
                ? '만료됨'
                : result.type === 'invalid'
                  ? '유효하지 않음'
                  : '오류'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {result.message}
          </p>
          {result.type === 'success' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              3초 후 자동으로 홈으로 이동합니다...
            </p>
          )}
          {result.type !== 'success' && (
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <XCircle size={64} className="mx-auto text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            초대장을 찾을 수 없습니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            유효하지 않거나 만료된 초대 링크입니다.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const RoleIcon = roleIcons[invitation.role];
  const isExpiringSoon =
    invitation.expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24시간 미만

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            팀 초대장
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {invitation.inviterName}님이 팀에 초대했습니다
          </p>
        </div>

        {/* 초대 정보 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {invitation.teamName}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${roleColors[invitation.role]}`}
              >
                <RoleIcon size={16} />
                {roleLabels[invitation.role]}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              {roleDescriptions[invitation.role]}
            </p>
          </div>

          {/* 초대자 메시지 */}
          {invitation.message && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {invitation.inviterName}님의 메시지:
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                {invitation.message}
              </p>
            </div>
          )}

          {/* 만료 경고 */}
          {isExpiringSoon && !invitation.isExpired && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  곧 만료됩니다
                </span>
              </div>
              <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                이 초대장은{' '}
                {invitation.expiresAt.toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                에 만료됩니다.
              </p>
            </div>
          )}

          {/* 사용자 정보 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              초대받은 계정
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {user.name || user.email}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-4">
            <button
              onClick={handleAcceptInvitation}
              disabled={processing || invitation.isExpired}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? '처리 중...' : '초대 수락'}
            </button>
            <button
              onClick={handleRejectInvitation}
              disabled={processing || invitation.isExpired}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              거절
            </button>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            문제가 있나요?{' '}
            <a
              href="mailto:support@almus.com"
              className="text-blue-600 hover:underline"
            >
              고객지원
            </a>
            에 문의하세요.
          </p>
        </div>
      </div>
    </div>
  );
};
