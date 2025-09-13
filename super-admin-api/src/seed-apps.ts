import { DataSource } from 'typeorm';
import { App } from './apps/entities/app.entity';

async function seedApps() {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: 'database.sqlite',
    entities: [App],
    synchronize: true,
  });

  await dataSource.initialize();

  const appRepository = dataSource.getRepository(App);

  // Xóa dữ liệu cũ
  await appRepository.clear();

  // Tạo sample apps
  const sampleApps = [
    {
      name: 'Gmail',
      url: 'https://mail.google.com',
      icon: 'mail',
    },
    {
      name: 'Google Drive',
      url: 'https://drive.google.com',
      icon: 'cloud',
    },
    {
      name: 'GitHub',
      url: 'https://github.com',
      icon: 'github',
    },
    {
      name: 'Slack',
      url: 'https://slack.com',
      icon: 'message',
    },
    {
      name: 'Trello',
      url: 'https://trello.com',
      icon: 'project',
    },
    // Apps cho Module Federation testing
    {
      name: 'shell-mf-host',
      url: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      icon: 'desktop',
      allowedScopes: ['read:demo', 'read:users', 'read:apps'],
    },
    {
      name: 'mini_portal_mf',
      url: 'http://localhost:5174',
      origin: 'http://localhost:5174',
      icon: 'appstore',
      allowedScopes: ['read:demo'],
    },
  ];

  for (const appData of sampleApps) {
    const app = appRepository.create(appData);
    await appRepository.save(app);
    console.log(`Created app: ${app.name}`);
  }

  console.log('Seed completed!');
  await dataSource.destroy();
}

seedApps().catch(console.error);
