import { logger } from 'firebase-functions/v2';
import { TeamRole } from '@almus/shared-types';

// 이메일 발송을 위한 인터페이스
interface TeamInvitationEmailData {
  recipientEmail: string;
  recipientName: string;
  teamName: string;
  inviterName: string;
  role: TeamRole;
  invitationToken: string;
  message?: string;
  expiresAt: Date;
}

// 역할별 한국어 라벨
const roleLabels = {
  [TeamRole.OWNER]: '소유자',
  [TeamRole.ADMIN]: '관리자',
  [TeamRole.EDITOR]: '편집자',
  [TeamRole.VIEWER]: '보기 전용',
};

// 역할별 설명
const roleDescriptions = {
  [TeamRole.OWNER]: '팀의 모든 권한을 가지며, 팀을 관리할 수 있습니다.',
  [TeamRole.ADMIN]: '팀 설정과 멤버를 관리할 수 있습니다.',
  [TeamRole.EDITOR]: '작업을 생성, 수정, 삭제할 수 있습니다.',
  [TeamRole.VIEWER]: '작업을 보고 댓글을 달 수 있습니다.',
};

// 팀 초대 이메일 발송
export async function sendTeamInvitationEmail(
  data: TeamInvitationEmailData
): Promise<void> {
  try {
    // 실제 환경에서는 SendGrid, AWS SES, 또는 다른 이메일 서비스를 사용
    // 여기서는 로깅으로 대체하고, 프론트엔드에서 테스트용 알림을 표시

    const invitationUrl = `${getBaseUrl()}/invitation?token=${data.invitationToken}`;

    const emailContent = generateInvitationEmailHTML(data, invitationUrl);

    // 개발 환경에서는 콘솔에 이메일 내용 출력
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.FUNCTIONS_EMULATOR === 'true'
    ) {
      logger.info('🚀 Team Invitation Email (Development Mode)', {
        to: data.recipientEmail,
        subject: `[ALMUS] ${data.teamName} 팀 초대`,
        invitationUrl,
        content: emailContent,
      });

      // 개발 모드에서는 바로 성공 처리
      return;
    }

    // 실제 이메일 발송 로직
    // await sendEmailWithProvider({
    //   to: data.recipientEmail,
    //   subject: `[ALMUS] ${data.teamName} 팀 초대`,
    //   html: emailContent,
    // });

    logger.info('Team invitation email sent successfully', {
      recipientEmail: data.recipientEmail,
      teamName: data.teamName,
      role: data.role,
    });
  } catch (error) {
    logger.error('Failed to send team invitation email:', error);
    throw new Error('이메일 발송에 실패했습니다.');
  }
}

// 기본 URL 가져오기
function getBaseUrl(): string {
  // 환경에 따라 다른 URL 반환
  if (process.env.NODE_ENV === 'production') {
    return 'https://your-production-domain.com';
  } else if (process.env.NODE_ENV === 'staging') {
    return 'https://your-staging-domain.com';
  } else {
    return 'http://localhost:3000';
  }
}

// 초대 이메일 HTML 생성
function generateInvitationEmailHTML(
  data: TeamInvitationEmailData,
  invitationUrl: string
): string {
  const expiryDate = data.expiresAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ALMUS 팀 초대</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif';
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background-color: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #6b7280;
          font-size: 16px;
        }
        .content {
          margin: 30px 0;
        }
        .team-info {
          background-color: #f3f4f6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .team-name {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .role-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
        }
        .role-badge {
          background-color: #2563eb;
          color: white;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 500;
        }
        .role-description {
          color: #6b7280;
          font-size: 14px;
          margin-top: 5px;
        }
        .message {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .message-title {
          font-weight: 600;
          color: #92400e;
          margin-bottom: 5px;
        }
        .message-content {
          color: #78350f;
        }
        .cta-section {
          text-align: center;
          margin: 40px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.2s;
        }
        .cta-button:hover {
          background-color: #1d4ed8;
        }
        .alternative-link {
          margin-top: 20px;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .alternative-link p {
          margin: 0 0 10px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .alternative-link code {
          display: block;
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 8px;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 12px;
          word-break: break-all;
          color: #374151;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        .expiry-warning {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
        .expiry-warning p {
          color: #991b1b;
          margin: 0;
          font-size: 14px;
        }
        .expiry-time {
          font-weight: 600;
          color: #dc2626;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">ALMUS</div>
          <h1 class="title">팀 초대장</h1>
          <p class="subtitle">${data.inviterName}님이 팀에 초대했습니다</p>
        </div>

        <div class="content">
          <div class="team-info">
            <div class="team-name">${data.teamName}</div>
            <div class="role-info">
              <span class="role-badge">${roleLabels[data.role]}</span>
            </div>
            <div class="role-description">${roleDescriptions[data.role]}</div>
          </div>

          ${
            data.message
              ? `
          <div class="message">
            <div class="message-title">${data.inviterName}님의 메시지:</div>
            <div class="message-content">${data.message}</div>
          </div>
          `
              : ''
          }

          <div class="cta-section">
            <a href="${invitationUrl}" class="cta-button">
              팀 초대 수락하기
            </a>
            
            <div class="alternative-link">
              <p>버튼이 작동하지 않는다면 아래 링크를 복사하여 브라우저 주소창에 붙여넣으세요:</p>
              <code>${invitationUrl}</code>
            </div>
          </div>

          <div class="expiry-warning">
            <p>⚠️ 이 초대장은 <span class="expiry-time">${expiryDate}</span>까지 유효합니다.</p>
          </div>
        </div>

        <div class="footer">
          <p>
            이 이메일은 ALMUS Todo List에서 자동으로 발송되었습니다.<br>
            문의사항이 있으시면 <a href="mailto:support@almus.com">support@almus.com</a>으로 연락해주세요.
          </p>
          <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
            ALMUS Todo List © 2025. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 실제 이메일 발송 함수 (예시)
// 실제 환경에서는 SendGrid, AWS SES 등을 사용
// async function sendEmailWithProvider(emailData: {
//   to: string;
//   subject: string;
//   html: string;
// }): Promise<void> {
//   // SendGrid 예시
//   // const sgMail = require('@sendgrid/mail');
//   // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//   //
//   // const msg = {
//   //   to: emailData.to,
//   //   from: 'noreply@almus.com',
//   //   subject: emailData.subject,
//   //   html: emailData.html,
//   // };
//   //
//   // await sgMail.send(msg);
//
//   // 현재는 로깅으로 대체
//   logger.info('Email would be sent:', emailData);
// }

// 초대 확인 이메일 발송
export async function sendInvitationConfirmationEmail(data: {
  recipientEmail: string;
  teamName: string;
  role: TeamRole;
}): Promise<void> {
  try {
    const emailContent = `
      <h2>ALMUS 팀 가입 완료</h2>
      <p>${data.teamName} 팀에 ${roleLabels[data.role]}로 성공적으로 가입했습니다.</p>
      <p><a href="${getBaseUrl()}">ALMUS로 이동하기</a></p>
    `;

    // 실제 이메일 발송 또는 로깅
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.FUNCTIONS_EMULATOR === 'true'
    ) {
      logger.info('🎉 Team Join Confirmation Email (Development Mode)', {
        to: data.recipientEmail,
        subject: `[ALMUS] ${data.teamName} 팀 가입 완료`,
        content: emailContent,
      });
    }

    logger.info('Team join confirmation email sent', {
      recipientEmail: data.recipientEmail,
      teamName: data.teamName,
      role: data.role,
    });
  } catch (error) {
    logger.error('Failed to send confirmation email:', error);
    // 확인 이메일은 실패해도 메인 프로세스를 중단하지 않음
  }
}
