import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationTemplateService {
  async getTemplate(type: string): Promise<any> {
    // TODO: 실제 템플릿 로직 구현
    return {
      type,
      title: 'Notification',
      body: 'You have a new notification',
    };
  }

  async createTemplate(templateData: any): Promise<any> {
    // TODO: 템플릿 생성 로직 구현
    return templateData;
  }

  async updateTemplate(id: string, updateData: any): Promise<any> {
    // TODO: 템플릿 업데이트 로직 구현
    return { id, ...updateData };
  }

  async deleteTemplate(id: string): Promise<void> {
    // TODO: 템플릿 삭제 로직 구현
  }
}