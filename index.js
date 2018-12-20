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
//var certificato=require('dcrypt');
//apl **************
const AplTest= require('./apl_template.json');
//************ modifica del 20/12/2018 */
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
  //bot=req.query.ava;
  console.log('***************headers della richiesta = '+ JSON.stringify(req.headers));
  console.log('sessionID di Alexa= ' + sessionId);

  if (req.body.request.type === 'LaunchRequest') {
      strRicerca='zzzstart';
  } else if (req.body.request.type === 'IntentRequest' &&
    req.body.request.intent.name === 'AnyText') {     
      //modifica del 02/12/2018 faccio encoding in utf8-> utf8.encode()
      strRicerca=utf8.encode(request.intent.slots.searchText.value); 
      strRicerca = querystring.escape(strRicerca); 
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
                  resp.json({           
                      "version": "1.0",
                      "response": {
                          "shouldEndSession": boolEndSession, //false
                          "outputSpeech": {
                          "type": "PlainText",
                          "text": strOutput
                    
                          },
                          "directives": [
                            {
                                "type": "Alexa.Presentation.APL.RenderDocument",
                               // "token": "[SkillDeveloperProvidedToken]",
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
                                                        "source": "https://upload.wikimedia.org/wikipedia/commons/a/ab/House_mouse.jpg"
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