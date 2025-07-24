import React, { useState, useEffect } from 'react';
import { CollaborativeWorkspace } from './CollaborativeWorkspace';
import { CommentSystem } from './CommentSystem';
import { MentionNotifications } from './MentionNotifications';
import { CollaborativeTextEditor } from './CollaborativeTextEditor';
import { useWebSocket } from '../../services/websocket';
import { useAuth } from '../../hooks/useAuth';
import { useUserPresence } from '../../hooks/useUserPresence';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  MessageCircle, 
  Edit3, 
  Bell, 
  Wifi, 
  WifiOff,
  Play,
  Square
} from 'lucide-react';

interface DemoData {
  title: string;
  description: string;
  content: string;
}

export const CollaborationDemo: React.FC = () => {
  const { user } = useAuth();
  const websocket = useWebSocket();
  const { isOnline, onlineUsers, updateStatus } = useUserPresence();
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentDemo, setCurrentDemo] = useState<'task' | 'project' | 'document'>('task');
  const [demoData, setDemoData] = useState<DemoData>({
    title: '실시간 협업 데모 작업',
    description: '이 작업은 실시간 협업 기능을 시연하기 위한 샘플 작업입니다.',
    content: '여기에 작업의 상세 내용을 입력하세요. 다른 사용자와 실시간으로 동시 편집이 가능합니다.'
  });

  // WebSocket 연결 초기화
  useEffect(() => {
    const initializeDemo = async () => {
      if (!user) return;

      try {
        if (!websocket.isConnected()) {
          await websocket.connect();
        }
        setIsConnected(true);
        await updateStatus('ONLINE');
      } catch (error) {
        console.error('Failed to initialize collaboration demo:', error);
        setIsConnected(false);
      }
    };

    initializeDemo();

    return () => {
      updateStatus('OFFLINE').catch(console.error);
    };
  }, [user, websocket, updateStatus]);

  const handleDataChange = (data: Record<string, any>) => {
    setDemoData(prev => ({ ...prev, ...data }));
  };

  const handleSave = async (data: Record<string, any>) => {
    // 실제 저장 로직 (API 호출 등)
    console.log('Saving demo data:', data);
    
    // 시뮬레이션: 저장 완료 후 피드백
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('Demo data saved successfully');
        resolve(data);
      }, 1000);
    });
  };

  const getDemoResourceId = () => {
    return `demo-${currentDemo}-${Date.now()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-100 text-green-800';
      case 'AWAY': return 'bg-yellow-100 text-yellow-800';
      case 'BUSY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE': return '🟢';
      case 'AWAY': return '🟡'; 
      case 'BUSY': return '🔴';
      default: return '⚫';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">로그인이 필요합니다</h3>
              <p className="text-gray-600">실시간 협업 기능을 사용하려면 먼저 로그인해주세요.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">실시간 협업 시스템 데모</h1>
          <p className="text-gray-600 mt-2">
            동시 편집, 실시간 댓글, 멘션 시스템을 경험해보세요.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* 연결 상태 */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '연결됨' : '연결 안됨'}
            </span>
          </div>

          {/* 멘션 알림 */}
          <MentionNotifications />

          {/* 상태 변경 버튼 */}
          <div className="flex items-center gap-2">
            <Button
              variant={isOnline ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateStatus(isOnline ? 'AWAY' : 'ONLINE')}
            >
              {isOnline ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isOnline ? 'AWAY로 변경' : 'ONLINE으로 변경'}
            </Button>
          </div>
        </div>
      </div>

      {/* 통계 및 현재 사용자 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{onlineUsers.length}</p>
                <p className="text-xs text-gray-600">온라인 사용자</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-gray-600">실시간 댓글</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Edit3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">1</p>
                <p className="text-xs text-gray-600">동시 편집 중</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-gray-600">새 멘션</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 온라인 사용자 목록 */}
      {onlineUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              온라인 사용자 ({onlineUsers.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {onlineUsers.map(user => (
                <Badge 
                  key={user.userId} 
                  className={getStatusColor(user.status)}
                >
                  <span className="mr-1">{getStatusIcon(user.status)}</span>
                  User {user.userId}
                  {user.isTyping && <span className="ml-1 animate-pulse">...</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데모 타입 선택 */}
      <div className="flex items-center gap-4">
        <span className="font-medium">데모 타입:</span>
        <div className="flex gap-2">
          {[
            { key: 'task', label: '작업', icon: '📋' },
            { key: 'project', label: '프로젝트', icon: '📁' },
            { key: 'document', label: '문서', icon: '📄' }
          ].map(({ key, label, icon }) => (
            <Button
              key={key}
              variant={currentDemo === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentDemo(key as any)}
            >
              <span className="mr-1">{icon}</span>
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* 메인 데모 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 협업 워크스페이스 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                실시간 협업 워크스페이스
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CollaborativeWorkspace
                resourceType={currentDemo.toUpperCase() as any}
                resourceId={getDemoResourceId()}
                title={demoData.title}
                data={demoData}
                onDataChange={handleDataChange}
                onSave={handleSave}
                className="border-0 rounded-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 개별 에디터 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">개별 에디터 테스트</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">제목 편집</label>
                <CollaborativeTextEditor
                  resourceType={currentDemo.toUpperCase() as any}
                  resourceId={getDemoResourceId()}
                  fieldPath="title"
                  initialValue={demoData.title}
                  placeholder="제목을 입력하세요..."
                  onValueChange={(value) => handleDataChange({ title: value })}
                  onSave={(value) => handleDataChange({ title: value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">내용 편집</label>
                <CollaborativeTextEditor
                  resourceType={currentDemo.toUpperCase() as any}
                  resourceId={getDemoResourceId()}
                  fieldPath="content"
                  initialValue={demoData.content}
                  placeholder="내용을 입력하세요..."
                  onValueChange={(value) => handleDataChange({ content: value })}
                  onSave={(value) => handleDataChange({ content: value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 댓글 시스템 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                실시간 댓글
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CommentSystem
                resourceType={currentDemo.toUpperCase() as any}
                resourceId={getDemoResourceId()}
                className="border-0 rounded-none max-h-96"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 사용 방법 안내 */}
      <Card>
        <CardHeader>
          <CardTitle>사용 방법</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="editing" className="w-full">
            <TabsList>
              <TabsTrigger value="editing">실시간 편집</TabsTrigger>
              <TabsTrigger value="comments">댓글 시스템</TabsTrigger>
              <TabsTrigger value="mentions">멘션 기능</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editing" className="mt-4">
              <div className="space-y-3 text-sm">
                <p><strong>동시 편집:</strong> 여러 사용자가 동시에 같은 문서를 편집할 수 있습니다.</p>
                <p><strong>실시간 동기화:</strong> 변경사항이 실시간으로 다른 사용자들에게 반영됩니다.</p>
                <p><strong>충돌 해결:</strong> Operational Transform 알고리즘으로 편집 충돌을 자동 해결합니다.</p>
                <p><strong>커서 표시:</strong> 다른 사용자의 커서 위치와 선택 영역을 볼 수 있습니다.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="comments" className="mt-4">
              <div className="space-y-3 text-sm">
                <p><strong>실시간 댓글:</strong> 댓글이 실시간으로 업데이트됩니다.</p>
                <p><strong>답글 기능:</strong> 댓글에 답글을 달 수 있습니다.</p>
                <p><strong>반응 기능:</strong> 댓글에 이모지 반응을 추가할 수 있습니다.</p>
                <p><strong>편집/삭제:</strong> 자신이 작성한 댓글을 편집하거나 삭제할 수 있습니다.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="mentions" className="mt-4">
              <div className="space-y-3 text-sm">
                <p><strong>멘션 생성:</strong> @사용자명을 입력하여 다른 사용자를 멘션할 수 있습니다.</p>
                <p><strong>실시간 알림:</strong> 멘션된 사용자에게 실시간 알림이 전송됩니다.</p>
                <p><strong>알림 관리:</strong> 우측 상단의 벨 아이콘으로 멘션 알림을 확인할 수 있습니다.</p>
                <p><strong>자동 완성:</strong> @ 입력 시 사용자 목록이 자동으로 표시됩니다.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};