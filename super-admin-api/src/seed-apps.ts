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
      allowedScopes: ['profile', 'email'],
    },
    {
      name: 'mini-portal-mf',
      url: 'http://localhost:5174',
      origin: 'http://localhost:5174',
      allowedScopes: ['read:demo', 'write:demo'],
      remoteEntry: '/bundles/mini-portal-mf/remoteEntry.js',
    },
  ];

  await appRepository.save(sampleApps);

  console.log('Seed completed!');
  await dataSource.destroy();
}

seedApps().catch(console.error);
