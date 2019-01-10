//09-10/01/2019 
//ollback a versione senza APL ma con la gestione dei comandi. ATTENZIONE: ABILITARE IN INTERFACES APL. 
//Inoltre, errore se Echo non supporta immagini
/************************ */
//07/01/2019 modifica gestione comandi con immagine: se 1 comando, e immagine, non chiudere la conversazione 
//20/12/2018 inizio analisi APL
//17/12/298 MODIFICA: IN ANNULLA -> CANCEL INTENT metto ShouldEndSession a true ossia stoppo la conversazione 
//02/12/2018 BUG: caratteri accentati incorretti causa errata codifica
//installato modulo utf8
var express = require('express');
//07/12/2018 aggiunto questo modulo per certificazione alexa
var verifier = require('alexa-verifier-middleware') 
var bodyParser = require('body-parser');
var http = require('http');
var querystring = require('querystring');
var path = require("path");
var fs = require("fs");
var utf8=require('utf8'); //modifica del 02/12/2018
//modifica del 06/12/2018 per certificazione Alexa


var bot='';
var app = express();
var alexaRouter = express.Router();
//app.use("/alexa", alexaRouter);
app.use("/", alexaRouter);
//modifica del 07/12/2018
alexaRouter.use(verifier);

app.use(express.static(__dirname));
//da mettere dopo
alexaRouter.use(bodyParser.json());

app.use("/ping", function (req, res, next) {
  
  res.send('Welcome to Panloquacity test');
});
/* configurazione della chiamata  */
postData = querystring.stringify({
    'searchText': 'ciao',
    'user':'',
    'pwd':'',
    'ava':'FarmaInfoBot'
    
  });
const options = {
    //modifica del 12/11/2018 : cambiato porta per supportare HTTPS
    
  hostname: '86.107.98.69', 
  port: 8080,
   /*port: 8443, 8080*/
   //rejectUnauthorized: false, // aggiunto qui 12/11/2018 
   path: '/AVA/rest/searchService/search_2?searchText=', 
   method: 'POST', 
   headers: {
     'Content-Type': 'application/json', 
    // 'Content-Length': Buffer.byteLength(postData),
     'Cookie':'' // +avaSession 
   }
 };

var server = http.createServer(app);
var port = process.env.PORT || 3000;
server.listen(port, function () {
    console.log("Server is up and running on port 3000...");
});

alexaRouter.post('/callAVA', function (req, res) {
    console.log('sono in  post /callAVA ');
    bot=req.query.ava;
  //modifica del 22/11/2018
    callAva(req,res);
  /*
   if (req.body.request.type === 'LaunchRequest') {
      
          callAvaLaunchRequest(req,res);
    }
    else if (req.body.request.type === 'IntentRequest' &&
             req.body.request.intent.name === 'AnyText') {     
       
            callAva(req, res);
         
        
    } else if (req.body.request.type === 'IntentRequest'  && req.body.request.intent.name === 'AMAZON.HelpIntent') { 
        console.log('Hai chiesto aiuto');
        callAva(req, res);
      
    } else if (req.body.request.type === 'IntentRequest'  && req.body.request.intent.name === 'AMAZON.StopIntent') { 
        console.log('Vuoi uscire');
     
    } else if (req.body.request.type === 'IntentRequest'  && req.body.request.intent.name === 'AMAZON.CancelIntent') { 
        console.log('Vuoi annullare');
        callAva(req, res);
          
    } else if (req.body.request.type === 'SessionEndedRequest') { 
        console.log('Session ended', req.body.request.reason);
        callAva(req, res);
       
    } */
    
});

/* modifica del 22/11/2018 
Passo a PLQ queste stringhe per gestire:
- intent di "welcome": passo "zzzstart" all'avvio della conversazione ossia al LaunchRequest->invocazione di Alexa
- intent di StopIntent: passo "zzzstop" quando utente dice "basta"
- intent di Cancel: passo "zzzcancel" quando utente dice "annulla"
- intent di Help: passo "zzzhelp" quando utente dice "aiuto"
- intent di Fallback: passo "zzzNoResponse" 
- intent di SessionEnded: passo "zzzEndSession"
*/
function callAva(req, resp){
  console.log('**************** sono in FUNZIONE callAva modificato');
  
  let strRicerca='';
  let data='';
  let strOutput='';
  let sessionId = req.body.session.sessionId;
  let request = req.body.request; //per slot
  let boolEndSession=false;
  //per sapere se device gestisce APL
  let blnApL=false;
  //bot=req.query.ava;
  console.log('***************headers della richiesta = '+ JSON.stringify(req.headers));
  //console.log('************** BODY della richiesta =' + JSON.stringify(req.body.context.System.device.supportedInterfaces));
  
  blnApL=supportDisplay(req);
  console.log('sessionID di Alexa= ' + sessionId);

  if (req.body.request.type === 'LaunchRequest') {
      strRicerca='zzzstart';
  } else if (req.body.request.type === 'IntentRequest' &&
    req.body.request.intent.name === 'AnyText') {     
      //modifica del 02/12/2018 faccio encoding in utf8-> utf8.encode()
      //20/12/2018 CHECK ERRORE COPITE E MULTI NON VENGONO RICONOSCIUTI!!
      //if(request.intent.slots.searchText.value){
        strRicerca=utf8.encode(request.intent.slots.searchText.value); 
        strRicerca = querystring.escape(strRicerca); 
        console.log('arriva la stringa.... '+ strRicerca);

      /*}else{

        console.log('******** parametro undefined***********');
      }*/
       
    } else if (req.body.request.type === 'IntentRequest'  && req.body.request.intent.name === 'AMAZON.HelpIntent') {
      strRicerca='zzzhelp';
    } else if (req.body.request.type === 'IntentRequest'  && req.body.request.intent.name === 'AMAZON.StopIntent') { 
      strRicerca='zzzstop';
      boolEndSession=true;
    } else if (req.body.request.type === 'IntentRequest'  && req.body.request.intent.name === 'AMAZON.CancelIntent') { 
      strRicerca='zzzcancel';
      boolEndSession=true; /*********** MODIFICA DEL 17/12/2018 */
    } else if (req.body.request.type === 'SessionEndedRequest') {
      strRicerca='zzzEndSession';
    } else if (req.body.request.intent.name === 'AMAZON.FallbackIntent') {  
      strRicerca='zzzNoResponse';
    } else if  (req.body.request.intent.name === 'AMAZON.NavigateHomeIntent') {
      strRicerca='zzznavigatehome';
      //zzznavigatehome,
    }
  //prendo il parametro....slot 
    //var str=request.intent.slots.searchText.value;
      if(strRicerca) {
         
         
          options.path+=strRicerca+'&user=&pwd=&ava='+bot;
          console.log('stringa ricerca  = '+ strRicerca + " bot interrogato "+bot);
      }
      var ss=leggiSessione(__dirname +'/sessions/', sessionId);
      if (ss===''){
          options.headers.Cookie='JSESSIONID=';
          console.log('DENTRO CALL AVA: SESSIONE VUOTA');
      }else {
           options.headers.Cookie='JSESSIONID='+ss;
           console.log('DENTRO CALL AVA:  HO LA SESSIONE + JSESSIONID');
      }
      
      var req1 = http.request(options, (res) => {
           
          console.log('________valore di options.cookie INIZIO ' + options.headers.Cookie);
          console.log(`STATUS DELLA RISPOSTA: ${res.statusCode}`);
          console.log(`HEADERS DELLA RISPOSTA: ${JSON.stringify(res.headers)}`);
          console.log('..............RES HEADER ' + res.headers["set-cookie"] );
         
          if (res.headers["set-cookie"]){
      
            var x = res.headers["set-cookie"].toString();
            var arr=x.split(';')
            var y=arr[0].split('=');
            
           console.log('id di sessione di ava =' + y[1]);
           
           scriviSessione(__dirname+'/sessions/',sessionId, y[1]); 
          } 
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
           console.log(`BODY: ${chunk}`);
           data += chunk;
         
           let c=JSON.parse(data);
                  strOutput=c.output[0].output; 
                 
                  strOutput=strOutput.replace(/(<\/p>|<p>|<b>|<\/b>|<br>|<\/br>|<strong>|<\/strong>|<div>|<\/div>|<ul>|<li>|<\/ul>|<\/li>|&nbsp;|)/gi, '');
                  let comandi=[];
                  let urlImg='';
                  comandi=getComandi(c.output[0].commands);
                  
                if (typeof comandi!=='undefined' && comandi.length>=1) {
                    console.log('ho almeno un comando, quindi prosegui con l\' azione ');
                  
                      if (comandi[0]=="STOP"){
                          console.log('++++++++++++ stoppo la conversazione')
                          boolEndSession=true;
                      }else{ 
                        console.log('++++++++++++ ho comando immagine')
                        boolEndSession=false;
                        urlImg=comandi[0];
                      }
                      if (typeof comandi[1] !== 'undefined' && comandi[0]=="STOP"){
                          console.log('+++++++++ stoppo la conversazione e mando link immagine')
                          boolEndSession=true;
                          urlImg=comandi[1];
                         
                      }
                  } else {
                    
                    console.log('non ci sono comandi, prosegui');
                  }
                  //COSTRUISCO JSON DI RISPOSTA CON SUPPORTO AD APL CON IMMAGINE
                  if (blnApL) {
                    console.log('rispondo con DIRETTIVA APL');
                    resp.json({           
                      "version": "1.0",
                      "response": {
                          "shouldEndSession": boolEndSession, //false
                          "outputSpeech": {
                          "type": "PlainText",
                          "text": strOutput
                          },
                          //******* GESTIONE APL 20/12/2018 */
                         "directives": [
                            {
                                "type": "Alexa.Presentation.APL.RenderDocument",
                              
                                "document": {
                                    "type": "APL",
                                    "version": "1.0",
                                    "theme": "auto",
                                    "mainTemplate": {
                                        "description": "APL Document",
                                        "parameters": [
                                            "payload"
                                        ],
                                        "items": [
                                            {
                                                "type": "Container",
                                                "direction": "column",
                                                "width": "100%",
                                                "height": "100%",
                                                "items": [
                                                    {
                                                        "type": "Image",
                                                        "source": urlImg //"https://upload.wikimedia.org/wikipedia/commons/a/ab/House_mouse.jpg"
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                } //qui datasources dopo ,
                            }
                        ]
                    
                      } //fine json
                   

                      }); 
                  } else {
                    //MANCA SUPPORTO PER DISPLAY
                    console.log('rispondo SENZA APL');
                    resp.json({           
                        "version": "1.0",
                        "response": {
                            "shouldEndSession": boolEndSession, //false
                            "outputSpeech": {
                            "type": "PlainText",
                            "text": strOutput
                            } 
                        } //fine json
                     

                    }); 
                }//fine check bnlAPL
                
          });
          res.on('end', () => {
            console.log('No more data in response.');
            
                 
                  options.path='/AVA/rest/searchService/search_2?searchText=';
                  
                  console.log('valore di options.path FINE ' +  options.path);
      
          });
        });
        
        req1.on('error', (e) => {
          console.error(`problem with request: ${e.message}`);
          strOutput="si è verificato errore " + e.message;
         
        });  
        
      req1.write(postData);
      req1.end();
      
};

/**** FUNZIONI A SUPPORTO */

function scriviSessione(path, strSessione, strValore) {
  
    fs.appendFile(path + strSessione,strValore, function (err) {
      if (err) {
        
        throw err;
      
      } else {
      console.log('DENTRO SCRIVI SESSIONE: SALVATO FILE '+ path + strSessione);
      
      }
       
    });
   
  } 
  
  function leggiSessione(path, strSessione){
    var contents='';
    try {
      fs.accessSync(__dirname+ '/sessions/'+ strSessione);
      contents = fs.readFileSync(__dirname+'/sessions/'+ strSessione, 'utf8');
      console.log('DENTRO LEGGI SESSIIONE ' +contents);
    
  
    }catch (err) {
      if (err.code==='ENOENT')
      console.log('DENTRO LEGGI SESSIONE :il file non esiste...')
     
    }
    return contents;
  
  } 
   //07/01/2019:
   // 18/12/2018
   //modificato il 07/01/2019
 function getComandi(arComandi)
 {

   var comandi=arComandi;
   var temp;
   if (comandi.length>0){
       //prosegui con il parsing
       //caso 1: ho solo un comando, ad esempio lo stop->prosegui con il parsing
       switch (comandi.length){
         case 1:
         //07/01/2019: ora il comando può contenere immagine, quindi verifica se presente =
           
           //comandi=arComandi;
           temp=comandi[0].toString();
           //è una stringa? Se si contiene il carattere "="
           var pos = temp.indexOf("=");
           if (pos >- 1) {

            //ho una stringa, quindi splitto per "="
            temp=temp.split("=");
            console.log('valore di temp[1]= ' +temp[1]);
            arComandi[0]=temp[1];
            comandi=arComandi;
           }
           break;

         case 2:
         //caso 2: ho due comandi, stop e img=path image, quindi devo scomporre comandi[1] 
            temp=arComandi[1].toString();
           //temp=img=https.....
           //splitto temp in un array con due elementi divisi da uguale
           temp=temp.split("=");
           console.log('valore di temp[1]= ' +temp[1]);
           arComandi[1]=temp[1];
           comandi=arComandi;

           //scompongo arComandi[1]
           break;

         default:
           //
           console.log('sono in default');

       }
      return comandi; //ritorno array come mi serve STOP oppure STOP, PATH img
     
   } else {
     console.log('non ci sono comandi')

     //non ci sono comandi quindi non fare nulla
     return undefined;
   }
  
 } 

 //10/01/2019
 //controllo se la skill supporta Apl e immagini, vedi come riferimento https://forums.developer.amazon.com/questions/196261/how-to-prevent-skill-with-apl-from-failing-on-devi.html?childToView=196262#answer-196262
 function supportDisplay(req){

  var blnSupportDisplay=false;

  if (req.body.context.System!=undefined && req.body.context.System.device !=undefined
      && req.body.context.System.device.supportedInterfaces !=undefined && 
      (req.body.context.System.device.supportedInterfaces['Alexa.Presentation.APL'] !=undefined ||
      req.body.context.System.device.supportedInterfaces.Display  !=undefined) &&
      req.body.context.Viewport  !=undefined)
       {
          blnSupportDisplay= true;
          console.log('LA SKILL SUPPORTA APL')

      } 
    return blnSupportDisplay;

 }