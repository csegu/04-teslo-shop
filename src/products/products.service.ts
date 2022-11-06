import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Repository } from 'typeorm';
import { validate as isUUId} from 'uuid';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('')

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ){}

  async create(createProductDto: CreateProductDto) {
    try {
      // if (!createProductDto.slug) {
      //   createProductDto.slug = createProductDto.title
      //     .toLowerCase()
      //     .replaceAll(' ','_')
      //     .replaceAll("'",'')
      // } else {
      //   createProductDto.slug = createProductDto.slug
      //     .toLowerCase()
      //     .replaceAll(' ','_')
      //     .replaceAll("'",'')
      // }
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);

      return product;

    } catch (error) {
      this.handleDBExceptions(error);      
    }
  }

  findAll(paginationDto: PaginationDto) {

    const {limit = 10, offset = 0} = paginationDto;
    // return this.productRepository.find().then( (data: Product[]) => {
    //   return data;
    // }, (error) => {
    //   this.handleDBExceptions(error)
    // });
    return this.productRepository.find({
      take: limit,
      skip: offset,
      //TODO relaciones
    });
  }

  async findOne(term: string) {

    let product: Product;

    if (isUUId(term)) {
      product = await this.productRepository.findOneBy({id: term});
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder(); 
      product = await queryBuilder
        .where('upper(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        }).getOne();
    }
    // return this.productRepository.findOne({where: {id: id} })
    //const product = await this.productRepository.findOneBy({term});
    if (!product) 
      throw new NotFoundException(`Product with id ${term} not found`);
        
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto
    });

    if (!product) throw new NotFoundException(`Product with id ${id} not found`);

    try {
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDBExceptions(error);
    }
    
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    //await this.productRepository.delete(id);
    await this.productRepository.remove(product);
    // return `This action removes a #${id} product`;
  }

  private handleDBExceptions(error: any) {
    if (error.code==='23505')
      throw new BadRequestException(error.detail);
    
    this.logger.error(error);
    throw new InternalServerErrorException('HELP! I NEED SOMEBODY! HELP!');
  }
}
