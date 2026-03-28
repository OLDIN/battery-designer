import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellsService } from './cells.service';
import { CellsController } from './cells.controller';
import { Cell } from './cell.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cell])],
  providers: [CellsService],
  controllers: [CellsController],
})
export class CellsModule {}
