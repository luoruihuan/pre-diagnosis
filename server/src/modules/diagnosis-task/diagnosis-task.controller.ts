import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { DiagnosisTaskService } from './diagnosis-task.service';
import { CreateDiagnosisTaskDto } from './dto/create-diagnosis-task.dto';
import { QueryDiagnosisTaskDto } from './dto/query-diagnosis-task.dto';

@ApiTags('诊断任务')
@Controller('diagnosis-tasks')
export class DiagnosisTaskController {
  constructor(private readonly taskService: DiagnosisTaskService) {}

  @Post()
  @ApiOperation({ summary: '创建诊断任务' })
  @SwaggerResponse({ status: 201, description: '创建成功' })
  create(@Body() createTaskDto: CreateDiagnosisTaskDto) {
    return this.taskService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findAll(@Query() queryDto: QueryDiagnosisTaskDto) {
    return this.taskService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除诊断任务' })
  @SwaggerResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
