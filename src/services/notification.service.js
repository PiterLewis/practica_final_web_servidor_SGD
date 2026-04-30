import { EventEmitter } from 'node:events';
import { config } from '../config/index.js';

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.on('error', (err) => console.error('[notification]', err));
  }
}

export const notificationService = new NotificationService();

if (!config.isTest) {
  notificationService.on('user:registered', ({ email }) => {
    console.log(`[notification] user:registered ${email}`);
  });

  notificationService.on('user:verified', ({ email }) => {
    console.log(`[notification] user:verified ${email}`);
  });

  notificationService.on('user:invited', ({ email, invitedBy }) => {
    console.log(`[notification] user:invited ${email} (por ${invitedBy})`);
  });

  notificationService.on('user:deleted', ({ email, type }) => {
    console.log(`[notification] user:deleted (${type}) ${email}`);
  });
}
