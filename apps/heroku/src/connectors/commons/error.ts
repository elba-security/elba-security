type HerokuErrorOptions = { response?: Response; request?: Request };

export class HerokuError extends Error {
 response?: Response;
 request?: Request;


 constructor(message: string, { response, request }: HerokuErrorOptions = {}) {
   super(message);
   this.response = response;
   this.request = request;
 }
}
