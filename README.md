<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>


# Teslo API

1. Clonar proyecto

2. Instalar
```
yarn install
```

3. Clonar el archivo ```.env.template``` y renombrarlo a ```.env``` con la información correspondiente

4. Levantar base de datos
```
docker-compose up -d
```

5. Arrancar la aplicación
```
yarn start:dev
```

6. Ejecutar SEED para cargar base de datos
```
http://localhost:3000/api/seed
```