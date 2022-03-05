const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const session = require('express-session');

var data_base;
const dbname = '9walczak';

const host = '172.20.44.25';
//const host = 'localhost:27017';

const url = 'mongodb://9walczak:pass9walczak@' + host + '/' + dbname;
//const url = 'mongodb://' + host + '/' + dbname;
const app = express();
const port = 4056;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
   secret: 'some-secret',
   resave: true,
   saveUninitialized: true
}));


app.listen(port,function() {
   console.log('listening on ' + port);
})

app.get('/', function(req,res) {
   res.sendFile(__dirname + '/home.html');
})

app.get('/analise.js', function(req,res) {
   res.sendFile(__dirname + '/analise.js');
})

app.get('/ind_style.css', function(req,res) {
   res.sendFile(__dirname + '/ind_style.css');
})

app.get('/ind_script.js', function(req,res) {
   res.sendFile(__dirname + '/ind_script.js');
})


//sending data from local to serwer
app.post('/sending', async function(req, res) {

   if( req.session.logged == true ) {
      values = req.body;
      console.log(values);

      for(i = 0; i < values.length; i++) {
         value = values[i];

         result = await data_base.collection('Measurments').findOne({ date : value.date, time : value.time });
         console.log("result: " + JSON.stringify(result) );

         if( ! result ) {
            delete value["_id"];
            data_base.collection('Measurments').insertOne(value, function(err, res) {
               if(err) throw err;
               console.log("Dodano obiekt : " + value);
            })
         }
         else {
            console.log("Obiekt juz jest w bazie");
         }
      }
      if (values.length) res.redirect('/');
      else res.status(306).send("Baza lokalna byla pusta");
   }
   else {
      console.log("Nie zalogowano");
      res.status(401).send("Odmowa dostepu \n Nie zalogowano");
   }
})



//Authorisation Forms
app.get('/LoginForm', function(req, res) {
   res.sendFile(__dirname + '/login.html');
})

app.get('/log_style.css', function(req,res) {
   res.sendFile(__dirname + '/log_style.css');
})

app.get('/SignForm', function(req, res) {
   res.sendFile(__dirname + '/sign.html');
})

app.get('/sig_style.css', function(req,res) {
   res.sendFile(__dirname + '/sig_style.css');
})


//Authorisation mechanism
app.get('/logout', function(req, res) {
   req.session.destroy();
   data_base.close();
   console.log("Wylogowano");
   res.redirect('/');
})

app.post('/login', function(req, res) {
   
   login = req.body.name;
   password = req.body.pass;

   if( login && password ) {

      mongodb.MongoClient.connect(url, function(err, db) {
         if (err) return console.log(err)
         data_base = db.db(dbname);
         console.log('Connected to Database');

         data_base.collection("Users").findOne({ name : login, pass : password }, function(err, result) {
            if (err) throw err;

            if( result != null ) {
               req.session.logged = true;
               req.session.username = login;
               console.log("Zalogowano: " + login);
               res.redirect('/');
            }
            else {
               res.status(401).send("Haslo lub login nie poprawne");
            }
         })
      })
   }
   else {
      console.log("Pola puste");
      res.status(401).send("Pole nie moze byc puste");
   }
})


app.post('/signin', function(req, res) {

   login = req.body.name;
   password = req.body.pass;

   if( login && password ) {

      mongodb.MongoClient.connect(url, async function(err, db) {
         if (err) return console.log(err)

         data_base = db.db(dbname);
         console.log('Connected to Database');
         
         value = { name : login, pass: password };
         result = await data_base.collection("Users").findOne({ name : login });

         if( ! result ) {
            data_base.collection('Users').insertOne(value, function(err, result) {
               if(err) throw err;
               console.log("Zarejestrowano uzytkownika: " + value.name);
            })
            res.redirect('/');
         }
         else {
            res.status(401).send("Uzytkownik juz istnieje");
         }
      });
   }
   else {
      res.status(401).send("Zadne pole nie moze byc puste");
   }
})



//sending data from server to local
app.get('/All', function(req, res) {
   if( req.session.logged == true ) {
      data_base.collection('Measurments').find({}).toArray( function(err, result) {
         if (err) throw err;

         res.status(200).send(result);
      })
   }
   else {
      console.log("Nie zalogowano");
      res.status(401).send("Odmowa dostepu \n Nie zalogowano");
   }
})


app.get('/AvgTemp/:date1/:date2', function(req, res) {
   
   date_start = new Date( Date.parse(req.params.date1) );
   date_end = new Date( Date.parse(req.params.date2) );

   var dates = [];
   let loop_date = new Date( date_start );
   while ( loop_date <= date_end ) {
      dates.push( loop_date.toISOString().split('T')[0] );
      loop_date = new Date( loop_date.setDate( loop_date.getDate() + 1) );
   }

   if( req.session.logged == true ) {

      data_base.collection('Measurments').find({ date : {$in : dates} }).toArray( function(err, result) {
         if (err) throw err;

         jason_tab = [];
         for( i = 0; i < dates.length; i++ ) {
            json_day = { date : dates[i], avg : 0, amount : 0 };
             
            for( j = 0; j < result.length; j++ ) {
               if( dates[i] == result[j].date ) {
                  json_day.avg = parseFloat(json_day.avg) + parseFloat(result[j].temp);
                  json_day.amount += 1;
               }
            }

            if( parseInt(json_day.amount) > 0)
               json_day.avg = Number( json_day.avg  / json_day.amount ).toFixed(3);
            else
               json_day.avg = 'Brak danych';
            jason_tab.push(json_day);
         }
         res.status(200).send(jason_tab);
      })
   }
   else {
      console.log("Nie zalogowano");
      res.status(401).send("Odmowa dostepu \n Nie zalogowano");
   }
})

app.get('/TempInDay/:date', function(req, res) {

   if( req.session.logged == true ) {
      
      data_base.collection('Measurments').find({ date : req.params.date }).toArray( function(err, result) {
         if (err) throw err;
         res.status(200).send(result);
      })
   }
   else {
      console.log("Nie zalogowano");
      res.status(401).send("Odmowa dostepu \n Nie zalogowano");
   }
})