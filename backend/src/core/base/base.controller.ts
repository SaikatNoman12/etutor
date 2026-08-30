import {
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BaseService } from './base.service';
import { BaseEntity } from './base.entity';
import { DeepPartial } from 'typeorm';

export abstract class BaseController<
    T extends BaseEntity,
    CreateDto extends DeepPartial<T> = DeepPartial<T>,
    UpdateDto extends DeepPartial<T> = DeepPartial<T>,
> {
    // The generic `@Body() dto: CreateDto` type ERASES at runtime, so the global
    // ValidationPipe never validates inherited create/update bodies — bad input (e.g. a
    // non-uuid foreign key) flows to the DB and 500s instead of 400. A subclass that does
    // NOT override create/update can pass its concrete DTO classes here and the base will
    // validate against them. Optional → backward-compatible with `super(service)`.
    constructor(
        protected readonly service: BaseService<T>,
        protected readonly createDtoClass?: new () => unknown,
        protected readonly updateDtoClass?: new () => unknown,
    ) {}

    // Validate a request body against a concrete DTO class (class-validator decorators),
    // throwing 400 — the validation the generic ValidationPipe cannot do at runtime.
    protected async validateBody<D>(body: unknown, cls?: new () => unknown): Promise<D> {
        if (!cls || body == null || typeof body !== 'object') return body as D;
        const instance = plainToInstance(cls, body) as object;
        const errors = await validate(instance, { whitelist: true });
        if (errors.length) {
            const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
            throw new BadRequestException(messages.length ? messages : 'Validation failed');
        }
        return instance as D;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new resource' })
    @ApiResponse({ status: 201, description: 'Resource created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(@Body() createDto: CreateDto): Promise<T> {
        const validated = await this.validateBody<CreateDto>(createDto, this.createDtoClass);
        return this.service.create(validated);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all resources' })
    @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<{
        items: T[];
        meta: { page: number; page_size: number; total: number };
    }> {
        // List endpoints return the { items, meta } envelope PROJECT_API mandates,
        // not a bare array. Unpaginated (no page/limit) returns every row.
        const currentPage = page && Number(page) > 0 ? Number(page) : 1;
        const currentLimit = limit && Number(limit) > 0 ? Number(limit) : undefined;
        const options = currentLimit
            ? { skip: (currentPage - 1) * currentLimit, take: currentLimit }
            : {};
        const [items, total] = await Promise.all([
            this.service.findAll(options),
            this.service.count(),
        ]);
        return {
            items,
            meta: {
                page: currentPage,
                page_size: currentLimit ?? total,
                total,
            },
        };
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get a resource by ID' })
    @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
    @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<T> {
        return this.service.findByIdOrFail(id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update a resource' })
    @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
    @ApiResponse({ status: 200, description: 'Resource updated successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateDto,
    ): Promise<T | null> {
        const validated = await this.validateBody<UpdateDto>(updateDto, this.updateDtoClass);
        return this.service.update(id, validated);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a resource' })
    @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
    @ApiResponse({ status: 204, description: 'Resource deleted successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.service.remove(id);
    }
}
