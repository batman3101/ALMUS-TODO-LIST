"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = exports.checkOverdueTasks = exports.checkDueTasks = exports.onTaskDeleted = exports.onTaskUpdated = exports.onTaskCreated = exports.rejectTeamInvitation = exports.acceptTeamInvitation = exports.inviteTeamMember = exports.sendTestNotification = exports.saveNotificationSettings = exports.getNotificationSettings = exports.deleteFCMToken = exports.saveFCMToken = exports.getTaskAggregation = exports.getTasks = exports.getTask = exports.deleteTask = exports.updateTask = exports.createTask = void 0;
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
// Firebase Admin 초기화
(0, app_1.initializeApp)();
// HTTP 함수들
var taskHttp_1 = require("./http/taskHttp");
Object.defineProperty(exports, "createTask", { enumerable: true, get: function () { return taskHttp_1.createTask; } });
Object.defineProperty(exports, "updateTask", { enumerable: true, get: function () { return taskHttp_1.updateTask; } });
Object.defineProperty(exports, "deleteTask", { enumerable: true, get: function () { return taskHttp_1.deleteTask; } });
Object.defineProperty(exports, "getTask", { enumerable: true, get: function () { return taskHttp_1.getTask; } });
Object.defineProperty(exports, "getTasks", { enumerable: true, get: function () { return taskHttp_1.getTasks; } });
Object.defineProperty(exports, "getTaskAggregation", { enumerable: true, get: function () { return taskHttp_1.getTaskAggregation; } });
// FCM HTTP 함수들
var fcmHttp_1 = require("./http/fcmHttp");
Object.defineProperty(exports, "saveFCMToken", { enumerable: true, get: function () { return fcmHttp_1.saveFCMToken; } });
Object.defineProperty(exports, "deleteFCMToken", { enumerable: true, get: function () { return fcmHttp_1.deleteFCMToken; } });
Object.defineProperty(exports, "getNotificationSettings", { enumerable: true, get: function () { return fcmHttp_1.getNotificationSettings; } });
Object.defineProperty(exports, "saveNotificationSettings", { enumerable: true, get: function () { return fcmHttp_1.saveNotificationSettings; } });
Object.defineProperty(exports, "sendTestNotification", { enumerable: true, get: function () { return fcmHttp_1.sendTestNotification; } });
// Team HTTP 함수들
var teamHttp_1 = require("./http/teamHttp");
Object.defineProperty(exports, "inviteTeamMember", { enumerable: true, get: function () { return teamHttp_1.inviteTeamMember; } });
Object.defineProperty(exports, "acceptTeamInvitation", { enumerable: true, get: function () { return teamHttp_1.acceptTeamInvitation; } });
Object.defineProperty(exports, "rejectTeamInvitation", { enumerable: true, get: function () { return teamHttp_1.rejectTeamInvitation; } });
// Firestore 트리거 함수들
var taskTriggers_1 = require("./triggers/taskTriggers");
Object.defineProperty(exports, "onTaskCreated", { enumerable: true, get: function () { return taskTriggers_1.onTaskCreated; } });
Object.defineProperty(exports, "onTaskUpdated", { enumerable: true, get: function () { return taskTriggers_1.onTaskUpdated; } });
Object.defineProperty(exports, "onTaskDeleted", { enumerable: true, get: function () { return taskTriggers_1.onTaskDeleted; } });
Object.defineProperty(exports, "checkDueTasks", { enumerable: true, get: function () { return taskTriggers_1.checkDueTasks; } });
Object.defineProperty(exports, "checkOverdueTasks", { enumerable: true, get: function () { return taskTriggers_1.checkOverdueTasks; } });
// Callable 함수들 (향후 확장용)
exports.helloWorld = (0, https_1.onCall)({
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
}, request => {
    return {
        message: 'Hello from Firebase Functions!',
        timestamp: new Date().toISOString(),
    };
});
//# sourceMappingURL=index.js.map