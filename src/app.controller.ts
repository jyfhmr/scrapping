import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  returnCurrency(@Body() body: {currencySearched:string}): Promise<string> {
    console.log("Petición llegando a controlador:",body)
    return this.appService.searchAndBroadcastRates(body.currencySearched);
  }
}
