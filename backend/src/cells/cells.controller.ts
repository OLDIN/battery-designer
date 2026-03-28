import { Controller, Get } from '@nestjs/common';
import { CellsService } from './cells.service';
import { Cell } from './cell.entity';

@Controller('cells')
export class CellsController {
  constructor(private readonly cellsService: CellsService) {}

  @Get()
  getAllCells(): Promise<Cell[]> {
    return this.cellsService.findAll();
  }
}
