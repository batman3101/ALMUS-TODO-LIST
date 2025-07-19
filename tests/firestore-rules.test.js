const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { getFirestore } = require('firebase/firestore');
const fs = require('fs');

const testEnv = await initializeTestEnvironment({
  projectId: 'almus-todo-app-test',
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8'),
  },
});

describe('Firestore Security Rules', () => {
  let db;

  beforeEach(async () => {
    await testEnv.clearFirestore();
    db = getFirestore(testEnv.authenticatedContext('user1').app());
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('Users Collection', () => {
    it('should allow users to read their own data', async () => {
      const userDoc = db.collection('users').doc('user1');
      await assertSucceeds(userDoc.get());
    });

    it('should not allow users to read other users data', async () => {
      const userDoc = db.collection('users').doc('user2');
      await assertFails(userDoc.get());
    });

    it('should allow users to create their own profile', async () => {
      const userDoc = db.collection('users').doc('user1');
      await assertSucceeds(userDoc.set({
        email: 'user1@example.com',
        name: 'User 1',
        role: 'EDITOR',
        teamId: 'team1',
        projectIds: ['project1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    });
  });

  describe('Teams Collection', () => {
    beforeEach(async () => {
      // 팀 멤버 설정
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
        await db.collection('teams').doc('team1').set({
          name: 'Test Team',
          description: 'Test team description',
          createdBy: 'user1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        await db.collection('teams').doc('team1').collection('members').doc('user1').set({
          role: 'ADMIN',
          joinedAt: new Date(),
        });
        
        await db.collection('teams').doc('team1').collection('members').doc('user2').set({
          role: 'EDITOR',
          joinedAt: new Date(),
        });
      });
    });

    it('should allow team members to read team data', async () => {
      const teamDoc = db.collection('teams').doc('team1');
      await assertSucceeds(teamDoc.get());
    });

    it('should allow team admins to update team data', async () => {
      const teamDoc = db.collection('teams').doc('team1');
      await assertSucceeds(teamDoc.update({
        name: 'Updated Team Name',
        updatedAt: new Date(),
      }));
    });

    it('should not allow non-members to read team data', async () => {
      const db2 = getFirestore(testEnv.authenticatedContext('user3').app());
      const teamDoc = db2.collection('teams').doc('team1');
      await assertFails(teamDoc.get());
    });
  });

  describe('Tasks Collection', () => {
    beforeEach(async () => {
      // 테스트 데이터 설정
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
        
        // 팀 설정
        await db.collection('teams').doc('team1').set({
          name: 'Test Team',
          createdBy: 'user1',
          isActive: true,
        });
        
        await db.collection('teams').doc('team1').collection('members').doc('user1').set({
          role: 'ADMIN',
        });
        
        await db.collection('teams').doc('team1').collection('members').doc('user2').set({
          role: 'EDITOR',
        });
        
        // Task 설정
        await db.collection('tasks').doc('task1').set({
          title: 'Test Task',
          description: 'Test task description',
          assigneeId: 'user2',
          status: 'TODO',
          priority: 'MEDIUM',
          createdBy: 'user1',
          teamId: 'team1',
          projectId: 'project1',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow team members to read tasks', async () => {
      const taskDoc = db.collection('tasks').doc('task1');
      await assertSucceeds(taskDoc.get());
    });

    it('should allow task assignee to update task', async () => {
      const db2 = getFirestore(testEnv.authenticatedContext('user2').app());
      const taskDoc = db2.collection('tasks').doc('task1');
      await assertSucceeds(taskDoc.update({
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
      }));
    });

    it('should allow team editors to create tasks', async () => {
      const db2 = getFirestore(testEnv.authenticatedContext('user2').app());
      const taskDoc = db2.collection('tasks').doc('task2');
      await assertSucceeds(taskDoc.set({
        title: 'New Task',
        description: 'New task description',
        assigneeId: 'user1',
        status: 'TODO',
        priority: 'HIGH',
        createdBy: 'user2',
        teamId: 'team1',
        projectId: 'project1',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    });

    it('should not allow viewers to create tasks', async () => {
      // 뷰어 역할 설정
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
        await db.collection('teams').doc('team1').collection('members').doc('user3').set({
          role: 'VIEWER',
        });
      });
      
      const db3 = getFirestore(testEnv.authenticatedContext('user3').app());
      const taskDoc = db3.collection('tasks').doc('task3');
      await assertFails(taskDoc.set({
        title: 'Unauthorized Task',
        teamId: 'team1',
        createdBy: 'user3',
      }));
    });
  });

  describe('Files Collection', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
        
        // 팀 설정
        await db.collection('teams').doc('team1').set({
          name: 'Test Team',
          createdBy: 'user1',
          isActive: true,
        });
        
        await db.collection('teams').doc('team1').collection('members').doc('user1').set({
          role: 'ADMIN',
        });
        
        await db.collection('teams').doc('team1').collection('members').doc('user2').set({
          role: 'EDITOR',
        });
        
        // 파일 메타데이터 설정
        await db.collection('files').doc('file1').set({
          name: 'test.pdf',
          size: 1024,
          type: 'application/pdf',
          url: 'https://example.com/file1.pdf',
          uploaderId: 'user1',
          uploaderName: 'User 1',
          teamId: 'team1',
          taskId: 'task1',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow team members to read files', async () => {
      const fileDoc = db.collection('files').doc('file1');
      await assertSucceeds(fileDoc.get());
    });

    it('should allow file uploader to update file metadata', async () => {
      const fileDoc = db.collection('files').doc('file1');
      await assertSucceeds(fileDoc.update({
        name: 'updated-test.pdf',
        updatedAt: new Date(),
      }));
    });

    it('should allow team editors to create files', async () => {
      const db2 = getFirestore(testEnv.authenticatedContext('user2').app());
      const fileDoc = db2.collection('files').doc('file2');
      await assertSucceeds(fileDoc.set({
        name: 'new-file.pdf',
        size: 2048,
        type: 'application/pdf',
        url: 'https://example.com/file2.pdf',
        uploaderId: 'user2',
        uploaderName: 'User 2',
        teamId: 'team1',
        taskId: 'task1',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    });

    it('should not allow non-team members to read files', async () => {
      const db3 = getFirestore(testEnv.authenticatedContext('user3').app());
      const fileDoc = db3.collection('files').doc('file1');
      await assertFails(fileDoc.get());
    });
  });
}); 