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
      // 18650
      { brand: 'Samsung', model: '30Q', formFactor: '18650', capacity: 3000, maxDischarge: 15, weight: 46, diameter: 18.3, length: 65.0 },
      { brand: 'Sony/Murata', model: 'VTC6', formFactor: '18650', capacity: 3120, maxDischarge: 30, weight: 47, diameter: 18.2, length: 65.0 },
      { brand: 'Samsung', model: '35E', formFactor: '18650', capacity: 3500, maxDischarge: 8, weight: 48, diameter: 18.5, length: 65.3 },
      { brand: 'Sanyo', model: 'NCR18650GA', formFactor: '18650', capacity: 3450, maxDischarge: 10, weight: 48, diameter: 18.5, length: 65.3 },
      { brand: 'LG', model: 'HG2', formFactor: '18650', capacity: 3000, maxDischarge: 20, weight: 47, diameter: 18.3, length: 65.0 },
      { brand: 'Molicel', model: 'P28A', formFactor: '18650', capacity: 2800, maxDischarge: 35, weight: 46, diameter: 18.3, length: 65.0 },
      { brand: 'Sony/Murata', model: 'VTC5A', formFactor: '18650', capacity: 2600, maxDischarge: 35, weight: 44, diameter: 18.2, length: 65.0 },
      { brand: 'Bak', model: 'N18650CP', formFactor: '18650', capacity: 3350, maxDischarge: 10, weight: 48, diameter: 18.3, length: 65.0 },
      { brand: 'EVE', model: '33G', formFactor: '18650', capacity: 3200, maxDischarge: 10, weight: 48, diameter: 18.3, length: 65.0 },
      
      // 21700
      { brand: 'Samsung', model: '50E', formFactor: '21700', capacity: 5000, maxDischarge: 9.8, weight: 69, diameter: 21.1, length: 70.6 },
      { brand: 'Molicel', model: 'P42A', formFactor: '21700', capacity: 4200, maxDischarge: 45, weight: 66, diameter: 21.4, length: 70.0 },
      { brand: 'Molicel', model: 'P45B', formFactor: '21700', capacity: 4500, maxDischarge: 50, weight: 70, diameter: 21.4, length: 70.0 },
      { brand: 'Samsung', model: '40T', formFactor: '21700', capacity: 4000, maxDischarge: 35, weight: 67, diameter: 21.1, length: 70.4 },
      { brand: 'Samsung', model: '50S', formFactor: '21700', capacity: 5000, maxDischarge: 25, weight: 72, diameter: 21.4, length: 70.6 },
      { brand: 'LG', model: 'M50LT', formFactor: '21700', capacity: 5000, maxDischarge: 14.4, weight: 69, diameter: 21.1, length: 70.6 },
      { brand: 'Lishen', model: 'LR2170SD', formFactor: '21700', capacity: 5000, maxDischarge: 9.6, weight: 69, diameter: 21.1, length: 70.6 },
      { brand: 'Bak', model: 'N21700CG', formFactor: '21700', capacity: 5000, maxDischarge: 15, weight: 69, diameter: 21.1, length: 70.6 },
    ];

    for (const data of seedData) {
      const cell = this.cellsRepository.create(data);
      await this.cellsRepository.save(cell);
    }
    console.log('Seeded top battery cells into database.');
  }
}
