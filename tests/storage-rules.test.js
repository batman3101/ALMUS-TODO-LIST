const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { getStorage } = require('firebase/storage');
const { getFirestore } = require('firebase/firestore');
const fs = require('fs');

const testEnv = await initializeTestEnvironment({
  projectId: 'almus-todo-app-test',
  storage: {
    rules: fs.readFileSync('storage.rules', 'utf8'),
  },
});

describe('Storage Security Rules', () => {
  let storage;

  beforeEach(async () => {
    await testEnv.clearStorage();
    storage = getStorage(testEnv.authenticatedContext('user1').app());
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('User Profile Images', () => {
    it('should allow users to upload their own profile image', async () => {
      const fileRef = storage.ref('users/user1/profile/avatar.jpg');
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      await assertSucceeds(fileRef.put(file));
    });

    it('should allow users to read their own profile image', async () => {
      const fileRef = storage.ref('users/user1/profile/avatar.jpg');
      await assertSucceeds(fileRef.getDownloadURL());
    });

    it('should not allow users to upload to other users profile', async () => {
      const fileRef = storage.ref('users/user2/profile/avatar.jpg');
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      await assertFails(fileRef.put(file));
    });

    it('should not allow unauthenticated users to upload profile images', async () => {
      const storage2 = getStorage(testEnv.unauthenticatedContext().app());
      const fileRef = storage2.ref('users/user1/profile/avatar.jpg');
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      await assertFails(fileRef.put(file));
    });
  });

  describe('Team Files', () => {
    beforeEach(async () => {
      // 팀 멤버 설정
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
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
      });
    });

    it('should allow team members to upload team files', async () => {
      const fileRef = storage.ref('teams/team1/document.pdf');
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      await assertSucceeds(fileRef.put(file));
    });

    it('should allow team members to read team files', async () => {
      const fileRef = storage.ref('teams/team1/document.pdf');
      await assertSucceeds(fileRef.getDownloadURL());
    });

    it('should not allow non-team members to upload team files', async () => {
      const storage2 = getStorage(testEnv.authenticatedContext('user3').app());
      const fileRef = storage2.ref('teams/team1/document.pdf');
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      await assertFails(fileRef.put(file));
    });

    it('should not allow non-team members to read team files', async () => {
      const storage2 = getStorage(testEnv.authenticatedContext('user3').app());
      const fileRef = storage2.ref('teams/team1/document.pdf');
      await assertFails(fileRef.getDownloadURL());
    });
  });

  describe('Project Files', () => {
    beforeEach(async () => {
      // 프로젝트 멤버 설정
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
        await db.collection('projects').doc('project1').set({
          name: 'Test Project',
          teamId: 'team1',
          createdBy: 'user1',
          isActive: true,
        });
        
        await db.collection('projects').doc('project1').collection('members').doc('user1').set({
          role: 'ADMIN',
        });
        
        await db.collection('projects').doc('project1').collection('members').doc('user2').set({
          role: 'EDITOR',
        });
      });
    });

    it('should allow project members to upload project files', async () => {
      const fileRef = storage.ref('projects/project1/specification.pdf');
      const file = new File(['test'], 'specification.pdf', { type: 'application/pdf' });
      await assertSucceeds(fileRef.put(file));
    });

    it('should allow project members to read project files', async () => {
      const fileRef = storage.ref('projects/project1/specification.pdf');
      await assertSucceeds(fileRef.getDownloadURL());
    });

    it('should not allow non-project members to upload project files', async () => {
      const storage2 = getStorage(testEnv.authenticatedContext('user3').app());
      const fileRef = storage2.ref('projects/project1/specification.pdf');
      const file = new File(['test'], 'specification.pdf', { type: 'application/pdf' });
      await assertFails(fileRef.put(file));
    });
  });

  describe('Task Files', () => {
    beforeEach(async () => {
      // 팀 멤버 설정
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
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
      });
    });

    it('should allow team editors to upload task files', async () => {
      const fileRef = storage.ref('tasks/task1/attachment.pdf');
      const file = new File(['test'], 'attachment.pdf', { type: 'application/pdf' });
      await assertSucceeds(fileRef.put(file));
    });

    it('should allow team members to read task files', async () => {
      const fileRef = storage.ref('tasks/task1/attachment.pdf');
      await assertSucceeds(fileRef.getDownloadURL());
    });

    it('should not allow team viewers to upload task files', async () => {
      // 뷰어 역할 설정
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = getFirestore(context);
        await db.collection('teams').doc('team1').collection('members').doc('user3').set({
          role: 'VIEWER',
        });
      });
      
      const storage3 = getStorage(testEnv.authenticatedContext('user3').app());
      const fileRef = storage3.ref('tasks/task1/attachment.pdf');
      const file = new File(['test'], 'attachment.pdf', { type: 'application/pdf' });
      await assertFails(fileRef.put(file));
    });
  });

  describe('Public Files', () => {
    it('should allow anyone to read public files', async () => {
      const fileRef = storage.ref('public/logo.png');
      await assertSucceeds(fileRef.getDownloadURL());
    });

    it('should not allow anyone to upload public files', async () => {
      const fileRef = storage.ref('public/logo.png');
      const file = new File(['test'], 'logo.png', { type: 'image/png' });
      await assertFails(fileRef.put(file));
    });
  });

  describe('File Size Limits', () => {
    it('should allow files under 100MB', async () => {
      const fileRef = storage.ref('teams/team1/large-file.pdf');
      const file = new File(['x'.repeat(50 * 1024 * 1024)], 'large-file.pdf', { type: 'application/pdf' });
      await assertSucceeds(fileRef.put(file));
    });

    it('should reject files over 100MB', async () => {
      const fileRef = storage.ref('teams/team1/too-large-file.pdf');
      const file = new File(['x'.repeat(150 * 1024 * 1024)], 'too-large-file.pdf', { type: 'application/pdf' });
      await assertFails(fileRef.put(file));
    });
  });

  describe('File Type Validation', () => {
    it('should allow common file types', async () => {
      const allowedTypes = [
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { name: 'text.txt', type: 'text/plain' },
      ];

      for (const fileInfo of allowedTypes) {
        const fileRef = storage.ref(`teams/team1/${fileInfo.name}`);
        const file = new File(['test'], fileInfo.name, { type: fileInfo.type });
        await assertSucceeds(fileRef.put(file));
      }
    });

    it('should reject executable files', async () => {
      const fileRef = storage.ref('teams/team1/script.exe');
      const file = new File(['test'], 'script.exe', { type: 'application/x-msdownload' });
      await assertFails(fileRef.put(file));
    });
  });
}); 