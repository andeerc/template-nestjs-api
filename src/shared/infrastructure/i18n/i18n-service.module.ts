import { Module } from "@nestjs/common";
import { AcceptLanguageResolver, CookieResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, './'),
        watch: true,
      },
      resolvers: [
        new CookieResolver(['lang']),
        new QueryResolver(['lang']),
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class I18nServiceModule {}
