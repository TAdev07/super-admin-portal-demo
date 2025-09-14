import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from '../apps/entities/app.entity';
import AdmZip from 'adm-zip';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class BundlesService {
  private readonly logger = new Logger(BundlesService.name);

  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
  ) {}

  async findRemoteEntry(baseDir: string): Promise<string | null> {
    // Try to find remoteEntry.js in common locations
    const possiblePaths = [
      'remoteEntry.js',
      'assets/remoteEntry.js',
      'dist/remoteEntry.js',
      'build/remoteEntry.js',
    ];

    for (const path of possiblePaths) {
      try {
        await fs.access(join(baseDir, path));
        return path;
      } catch {
        // Continue to next path
      }
    }

    // If not found in common locations, search recursively
    const searchRecursively = async (
      dir: string,
      relativePath = '',
    ): Promise<string | null> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const currentPath = join(dir, entry.name);
          const currentRelativePath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name;

          if (entry.isFile() && entry.name === 'remoteEntry.js') {
            return currentRelativePath;
          } else if (entry.isDirectory()) {
            const found = await searchRecursively(
              currentPath,
              currentRelativePath,
            );
            if (found) return found;
          }
        }
      } catch {
        // Ignore errors and continue
      }
      return null;
    };

    return searchRecursively(baseDir);
  }

  async processBundle(appCode: string, buffer: Buffer): Promise<void> {
    const app = await this.appRepository.findOne({ where: { code: appCode } });
    if (!app) {
      throw new HttpException(
        `App with code '${appCode}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const bundleDir = join(__dirname, '..', '..', 'public', 'bundles', appCode);

    // Clean up old bundle
    await fs.rm(bundleDir, { recursive: true, force: true });
    await fs.mkdir(bundleDir, { recursive: true });

    // Unzip new bundle
    try {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(bundleDir, true);
    } catch {
      throw new HttpException(
        'Failed to unzip bundle',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Find remoteEntry.js in the extracted bundle
    this.logger.log(`Searching for remoteEntry.js in ${bundleDir}`);
    const remoteEntryRelativePath = await this.findRemoteEntry(bundleDir);
    if (!remoteEntryRelativePath) {
      this.logger.error(
        `remoteEntry.js not found in bundle for app: ${appCode}`,
      );
      throw new HttpException(
        `'remoteEntry.js' not found in bundle`,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Found remoteEntry.js at: ${remoteEntryRelativePath}`);

    // Update app entity with the correct path
    const remoteEntryPath = `/bundles/${appCode}/${remoteEntryRelativePath}`;
    app.remoteEntry = remoteEntryPath;
    await this.appRepository.save(app);

    this.logger.log(
      `Updated app ${appCode} with remoteEntry: ${remoteEntryPath}`,
    );
  }
}
