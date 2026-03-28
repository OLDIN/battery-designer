import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cell } from './cell.entity';

@Injectable()
export class CellsService implements OnModuleInit {
  constructor(
    @InjectRepository(Cell)
    private readonly cellsRepository: Repository<Cell>,
  ) {}

  async onModuleInit() {
    await this.seedCells();
  }

  async findAll(): Promise<Cell[]> {
    return this.cellsRepository.find();
  }

  private async seedCells() {
    const count = await this.cellsRepository.count();
    if (count > 0) return; // Already seeded

    const seedData = [
      { brand: 'Samsung', model: '35E', formFactor: '18650', capacity: 3500, maxDischarge: 8, weight: 48, diameter: 18.2, length: 65.2 },
      { brand: 'LG', model: 'MJ1', formFactor: '18650', capacity: 3500, maxDischarge: 10, weight: 49, diameter: 18.3, length: 65.2 },
      { brand: 'Panasonic', model: 'NCR18650GA', formFactor: '18650', capacity: 3450, maxDischarge: 10, weight: 48, diameter: 18.5, length: 65.3 },
      { brand: 'Samsung', model: '30Q', formFactor: '18650', capacity: 3000, maxDischarge: 15, weight: 46, diameter: 18.2, length: 65.0 },
      { brand: 'LG', model: 'HG2', formFactor: '18650', capacity: 3000, maxDischarge: 20, weight: 45, diameter: 18.3, length: 65.2 },
      { brand: 'Sony', model: 'VTC6', formFactor: '18650', capacity: 3000, maxDischarge: 30, weight: 46.6, diameter: 18.2, length: 65.0 },
      { brand: 'Molicel', model: 'P28A', formFactor: '18650', capacity: 2800, maxDischarge: 35, weight: 46, diameter: 18.3, length: 65.0 },
      { brand: 'Samsung', model: '50E', formFactor: '21700', capacity: 5000, maxDischarge: 9.8, weight: 69, diameter: 21.1, length: 70.2 },
      { brand: 'Molicel', model: 'P42A', formFactor: '21700', capacity: 4200, maxDischarge: 45, weight: 67, diameter: 21.4, length: 70.0 },
      { brand: 'Samsung', model: '40T', formFactor: '21700', capacity: 4000, maxDischarge: 35, weight: 70, diameter: 21.1, length: 70.2 },
    ];

    for (const data of seedData) {
      const cell = this.cellsRepository.create(data);
      await this.cellsRepository.save(cell);
    }
    console.log('Seeded top battery cells into database.');
  }
}
