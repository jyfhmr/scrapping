import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  returnCurrency(@Body() body: {currencySearched:string}): Promise<string> {
    console.log("Petición llegando a controlador:",body)
    return this.appService.searchAndBroadcastRates(body.currencySearched);
  }


  @Get("/:currency")
  returnCurrencyGet(@Param('currency') currency: string): Promise<string> {
    console.log("Petición llegando a controlador:",currency)
    return this.appService.searchAndBroadcastRates(currency);
  }

}
