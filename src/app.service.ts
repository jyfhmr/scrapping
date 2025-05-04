import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

@Injectable()
export class AppService {
  private readonly url = 'https://www.bcv.org.ve/';
  private readonly maxRetries = 10;
  private readonly retryDelay = 5000; // 2 segundos de espera entre reintentos
  private agent = new https.Agent({
    rejectUnauthorized: false
  });

  async searchAndBroadcastRates(currencyRequired:string): Promise<string> {
    
  
    console.log("Ejecutando cron");
  
    // Agregamos la propiedad "euro" en el objeto resultante
    const resultMessage = {
      conn: 200,
      usd: 0,
      euro: 0,
      error: 0
    };
  
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Intento ${attempt}: Obteniendo tasas de cambio...`);
  
        const response = await axios.get(this.url, { timeout: 30000, httpsAgent: this.agent });
        const $ = cheerio.load(response.data);
  
        // Obtenemos la tasa del dólar
        const usdHtml = $('#dolar').html();
        if (!usdHtml) {
          throw new HttpException(
            "La tasa del dólar no pudo ser obtenida, posiblemente hubo un cambio en el sitio del BCV, contactar al desarrollador (0)",
            500
          );
        }
  
        // Obtenemos la tasa del euro
        const euroHtml = $('#euro').html();
        if (!euroHtml) {
          throw new HttpException(
            "La tasa del euro no pudo ser obtenida, posiblemente hubo un cambio en el sitio del BCV, contactar al desarrollador (1)",
            500
          );
        }
  
        // Extrae la fecha desde el atributo content
        const dateForRate = $('.date-display-single').attr('content');
        console.log("Fecha de la tasa de cambio obtenida:", dateForRate);
  
        // Convertir la fecha actual y la fecha de la tasa de cambio a formato YYYY-MM-DD
        const todayDate = new Date().toISOString().split('T')[0];
        const rateDate = dateForRate ? dateForRate.split('T')[0] : null;
  
        console.log("Fecha actual:", todayDate);
        console.log("Fecha de la tasa:", rateDate);
  
        // Verificación: si rateDate es nulo o no es una fecha válida, se detiene el proceso
        if (!rateDate || isNaN(Date.parse(rateDate))) {
          console.log("La fecha obtenida para la tasa de cambio no es válida o es nula. Proceso detenido.");
          return; // Salir si la fecha no es válida
        }
  
        // Si la tasa corresponde a la fecha actual, se continúa
        if (rateDate === todayDate) {
          console.log("La fecha de la tasa y la de hoy coincide, la tasa es para hoy . . .");
  
          resultMessage.usd = this.getChange(usdHtml);
          resultMessage.euro = this.getChange(euroHtml);
          resultMessage.conn = 200; // Éxito
  
          console.log("Tasas de cambio obtenidas exitosamente:", resultMessage);
  
          const message = "El precio actual de la moneda que buscas es: "

          if(currencyRequired === "dólar"){
            return message+" "+resultMessage.usd
          }else if(currencyRequired === "euro"){
            return message+" "+resultMessage.euro
          }else{
            return "La moneda que buscaste no existe, revisa el nombre"
          }
       
        } else {
          console.log("Las fechas no coinciden, no se actualiza:", rateDate, todayDate);
        }
  
        // Salir del método tras un éxito (o cuando la fecha no coincide)
        return;
      } catch (error) {
        console.log("Error detectado:", error);
        console.error(`Intento ${attempt} fallido. Error:`, error.message || error);
  
        // Determinar si el error es recuperable
        const isRecoverable = this.isRecoverableError(error);
  
        if (isRecoverable) {
          resultMessage.conn = 503; // Servicio no disponible
          if (attempt < this.maxRetries) {
            console.log(
              `Reintentando en ${this.retryDelay / 1000} segundos... (Intento ${attempt}/${this.maxRetries})`
            );
            await this.delay(this.retryDelay);
            continue; // Continúa al siguiente intento
          } else {
            console.log(`Máximo de intentos alcanzado (${this.maxRetries}). Retornando error.`);
            resultMessage.conn = 503;
            resultMessage.error = 1;
          }
        } else {
          // Error crítico, no reintentar
          resultMessage.conn = 500;
          resultMessage.error = 1;
          console.log(`Error crítico detectado. No se reintentará. Estado: 500.`);
          break; // Salir del bucle
        }
      }
    }
  
    // Enviar el resultado al superadmin incluso después de los reintentos
    console.log("El result message que se va a enviar", resultMessage);
  }
  
  





  /**
   * Determina si un error es recuperable y se puede intentar nuevamente.
   * @param error El error capturado en el bloque catch
   */
  private isRecoverableError(error: any): boolean {
    if (error.code === 'ECONNABORTED' ||
      error.code === "ECONNRESET" ||
      error.code === "ENOTFOUND" ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED'
    ) {
      return true;
    } else if (error instanceof HttpException) {
      const status = error.getStatus();
      return status === 500 || status === 503;
    }
    return false; // Otros errores son considerados críticos
  }

  /**
   * Función auxiliar para crear una pausa entre reintentos.
   * @param ms Milisegundos a esperar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extrae y parsea el valor de cambio de la tasa desde el HTML.
   */
  private getChange(html: string): number {
    try {
      const $ = cheerio.load(html);
      const element = $('strong');
      let text = element.text().trim();
      text = text.replace(',', '.');
      const rate = parseFloat(text);

      if (isNaN(rate)) {
        throw new HttpException(
          'La tasa no pudo ser obtenida, posiblemente hubo un cambio en el sitio del BCV, contactar al desarrollador (1)',
          500,
        );
      }

      return rate;

    } catch (error) {
      throw new HttpException("La tasa no pudo ser obtenida, posiblemente hubo un cambio en el sitio del BCV, contactar al desarrollador (2)", 500);
    }
  }
}
