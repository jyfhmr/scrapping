import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  returnCurrency(@Body() body: {currencySearched:string}): Promise<string> {
    return this.appService.searchAndBroadcastRates(body.currencySearched);
  }
}
