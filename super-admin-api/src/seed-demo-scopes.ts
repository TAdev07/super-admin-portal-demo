import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Role } from './auth/entities/role.entity';
import { Permission } from './auth/entities/permission.entity';

async function upsertPermission(
  ds: DataSource,
  code: string,
  description?: string,
) {
  const repo = ds.getRepository(Permission);
  // try colon version
  let perm = await repo.findOne({ where: { code } });
  if (!perm) {
    // if dot version exists, migrate it
    const dot = code.replace(/:/g, '.');
    const existingDot = await repo.findOne({ where: { code: dot } });
    if (existingDot) {
      existingDot.code = code;
      existingDot.description = existingDot.description ?? description ?? null;
      await repo.save(existingDot);
      return existingDot;
    }
    perm = repo.create({ code, description: description ?? null });
    await repo.save(perm);
  }
  return perm;
}

async function ensureRole(ds: DataSource, name: string, permCodes: string[]) {
  const roleRepo = ds.getRepository(Role);
  let role = await roleRepo.findOne({
    where: { name },
    relations: ['permissions'],
  });
  const perms = [] as Permission[];
  for (const code of permCodes) perms.push(await upsertPermission(ds, code));
  if (!role) {
    role = roleRepo.create({ name, description: null, permissions: perms });
  } else {
    const map = new Map(role.permissions.map((p) => [p.code, p]));
    for (const p of perms) map.set(p.code, p);
    role.permissions = Array.from(map.values());
  }
  await roleRepo.save(role);
  return role;
}

async function seed() {
  const ds = new DataSource({
    type: 'sqlite',
    database: 'database.sqlite',
    entities: [User, Role, Permission],
    synchronize: true,
  });
  await ds.initialize();

  // Define standard and demo scopes (colon notation)
  const adminPerms = [
    'users:read',
    'users:write',
    'roles:read',
    'roles:write',
    'permissions:read',
    'permissions:write',
    // app/demo specific
    'read:demo',
    'write:demo',
    'bus:publish',
  ];
  const userPerms = ['users:read'];

  const adminRole = await ensureRole(ds, 'admin', adminPerms);
  await ensureRole(ds, 'user', userPerms);

  const userRepo = ds.getRepository(User);
  const admin = await userRepo.findOne({
    where: { email: 'admin@example.com' },
    relations: ['roles'],
  });
  if (admin) {
    // attach admin role and set legacy role
    const map = new Map((admin.roles || []).map((r) => [r.name, r]));
    map.set(adminRole.name, adminRole);
    admin.roles = Array.from(map.values());
    admin.role = 'admin';
    await userRepo.save(admin);
    console.log('Updated admin@example.com with admin role and permissions');
  } else {
    console.warn(
      'User admin@example.com not found; no user updated. Create the user first then re-run this script.',
    );
  }

  await ds.destroy();
}

seed().catch((e) => {
  console.error('Seed failed', e);
  process.exit(1);
});
