import { Controller, Get, Query } from '@nestjs/common';
import { MaterialsService } from './materials.service';

@Controller()
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get('materials')
  listMaterials(@Query('q') q?: string) {
    return this.materials.listMaterials(q);
  }

  @Get('labour')
  listLabour() {
    return this.materials.listLabour();
  }

  @Get('equipment')
  listEquipment() {
    return this.materials.listEquipment();
  }

  @Get('cost-database')
  fullDatabase() {
    return this.materials.fullDatabase();
  }

  @Get('modules')
  modules() {
    return this.materials.listModules();
  }
}
