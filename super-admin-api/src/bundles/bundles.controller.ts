import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { BundlesService } from './bundles.service';

@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Post('upload/:appCode')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('bundles:upload')
  @UseInterceptors(FileInterceptor('bundle'))
  async uploadBundle(
    @Param('appCode') appCode: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException(
        'Bundle file is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.bundlesService.processBundle(appCode, file.buffer);

    return { message: 'Bundle uploaded and deployed successfully' };
  }
}
