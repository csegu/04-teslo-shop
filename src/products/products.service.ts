import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'
import { query } from 'express';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DataSource, Repository } from 'typeorm';
import { validate as isUUId} from 'uuid';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductImage } from './entities';


@Injectable()
export class ProductsService {

  private readonly logger = new Logger('')

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
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
      const {images = [], ...productDetails} = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.productImageRepository.create({url: image}))
      });
      await this.productRepository.save(product);

      return {...product, images: images};

    } catch (error) {
      this.handleDBExceptions(error);      
    }
  }

  async findAll(paginationDto: PaginationDto) {

    const {limit = 10, offset = 0} = paginationDto;
    // return this.productRepository.find().then( (data: Product[]) => {
    //   return data;
    // }, (error) => {
    //   this.handleDBExceptions(error)
    // });
    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      }
    });

    return products.map( product => ({
      ...product,
      images: product.images.map( img => img.url)
    }))
  }

  async findOne(term: string) {

    let product: Product;

    if (isUUId(term)) {
      product = await this.productRepository.findOneBy({id: term});
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod'); 
      product = await queryBuilder
        .where('upper(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }
    // return this.productRepository.findOne({where: {id: id} })
    //const product = await this.productRepository.findOneBy({term});
    if (!product) 
      throw new NotFoundException(`Product with id ${term} not found`);
        
    return product;
  }

  async findOnePlain(term: string) {
    const {images = [], ...rest} = await this.findOne(term);
    return {
      ...rest,
      images: images.map( image => image.url)
    }
  }


  async update(id: string, updateProductDto: UpdateProductDto) {

    const {images, ...toUpdate} = updateProductDto;
    
    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate
    });

    if (!product) throw new NotFoundException(`Product with id ${id} not found`);

    //Create Query Runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      
      if (images) {
        //Eliminamos imagenes anteriores
        await queryRunner.manager.delete(ProductImage, {product: {id}});
        
        product.images = images.map( 
          image => this.productImageRepository.create({url: image})
        );
      } else {
        //No hay imagenes
      }

      await queryRunner.manager.save(product);

      // await this.productRepository.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);

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


  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    
    try {
      return await query
        .delete()
        .where({})
        .execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }

  }


  private handleDBExceptions(error: any) {
    if (error.code==='23505')
      throw new BadRequestException(error.detail);
    
    this.logger.error(error);
    throw new InternalServerErrorException('HELP! I NEED SOMEBODY! HELP!');
  }
}
