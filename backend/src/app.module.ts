import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellsModule } from './cells/cells.module';
import { ProjectsModule } from './projects/projects.module';
import { Cell } from './cells/cell.entity';
import { Project } from './projects/project.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'battery-designer.sqlite',
      entities: [Cell, Project],
      synchronize: true, // Auto-create tables (good for dev)
    }),
    CellsModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
