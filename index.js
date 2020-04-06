const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const session = require('express-session');
const helmet = require('helmet');
const THIRTY_DAYS_IN_SEC = 2592000;
const TWO_HOURS_IN_SEC = 7200;
const { config } = require('./config');
const cors = require('cors');
const app = express();

// Body parser
app.use(express.json());
app.use(helmet());
app.use(cookieParser());
app.use(cors());
// Body parser for authenticate twitter
app.use(session({
  secret:config.sessionSecret,
  resave:true,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

// Basic Strategy
require('./utils/auth.js/strategies/basic');

//GOOGLE OAUTH STRATEGY
require('./utils/auth.js/strategies/oauth');

// Google Strategy
require('./utils/auth.js/strategies/google');


// Twitter strategy
require('./utils/auth.js/strategies/twitter');

app.post("/auth/sign-in", async (req, res, next) => {
  passport.authenticate("basic", function(error, data) {
    // Si no envio la propiedad rememberMe en el body por eso esta fallando
    const {rememberMe} = req.body;
    
    try {
       
     if (error || !data ) {
        return next(boom.unauthorized());
      }

      req.login(data, { session: false }, async (error) => { 
        if (error) {
         return next(error);
        }

        const { token, ...user } = data;
        // Si el atributo rememberMe es verdadero la expiracion sera 30 dias
        // de lo contrario la expiracion sera en 2 horas.
        
        res.cookie("token", token, {
          httpOnly: !config.dev,
          secure: !config.dev,
         // maxAge: rememberMe ? THIRTY_DAYS_IN_SEC : TWO_HOURS_IN_SEC

        });
   

        res.status(200).json(user);
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});

app.post('/auth/sign-up', async function(req, res, next){
    const {body:user} = req;
    try {
        await axios({
            url:`${config.apiUrl}/api/auth/sign-up`,
            method:'post',
            data:user
        });

      res.status(201).json({message: 'User created'});

    } catch (error) {
        next(error);
    }
});

app.post('/movie-create', async function(req, res, next){

         const {body:movie} = req;
         const {token} = req.cookies;
     try {
       await axios({
         url:`${config.apiUrl}/api/movies/create`,
         method:'post',
         data: movie,
         headers:{Authorization:`Bearer ${token}`},
       });
       res.status(200).json({message:'Movie created'})
     } catch (error) {
       next(error);
     }
});

app.get('/movies', async function(req, res, next){
       try {
        const { token } = req.cookies;
        
        const {data , status} = await axios({
          url:`${config.apiUrl}/api/movies`,
          method:'get',
          headers:{Authorization:`Bearer ${token}`},
        });
        
        if(!data || status !==200 ){
           next(boom.badImplementation('Bad implemation'));
        }

        res.status(200).json(data);
         
       } catch (error) {
         next(error)
       }
       
});

app.get('/movie/:movieId', async function(req, res, next){
  try {
    
    const {movieId} = req.params;
    const {token} = req.cookies;
    const {data , status} = await axios({
      url:`${config.apiUrl}/api/movies/${movieId}`,
      method:'get',
      headers:{Authorization:`Bearer ${token}`},
    });
    if(!data || status !==200 ){
       next(boom.badImplementation('Bad implemation'));
    }
    
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }

});

app.get("/user-movies", async function(req, res, next) {
  try {
    
    const { token } = req.cookies;
    const {id} = req.query;

    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-movies?id=${id}`,
      headers: { Authorization: `Bearer ${token}` },
      method: "get"
    });

    if (status !== 200) {
      return next(boom.badImplementation());
    }
  
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

app.post("/user-movies", async function(req, res, next) {
  try {
    const { body: userMovie } = req;
    const { token } = req.cookies;
   
    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-movies`,
      headers: { Authorization: `Bearer ${token}` },
      method: "post",
      data: userMovie
    });

    if (status !== 201) {
      return next(boom.badImplementation());
    }
  
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

app.delete('/movie-delete/:id', async function(req, res, next){
          

          try {
            const { id } = req.params;
            const {token} =  req.cookies;
            console.log(token)
            const {data, status} =   await axios({
                   url:`${config.apiUrl}/api/movies/${id}`,
                   headers:{Authorization:`Bearer ${token}`},
                   method:'delete'
               });
     
               if(status !== 200){
                return next(boom.badImplementation());
                }
    

               res.status(200).json({data})
          } catch (error) {
             next(error);
          }
});


app.delete('/user-movies/:userMovieId', async function(req, res, next){
    try{
      const { userMovieId } = req.params;
      const { token } = req.cookies;

      const { data, status } = await axios({
            url:`${config.apiUrl}/api/user-movies/${userMovieId}`,
            headers:{Authorization:`Bearer ${token}`},
            method:"delete" 
      });
       
        if(status !== 200){
            return next(boom.badImplementation());
        }

          res.status(200).json(data);

    } catch (error) {
        next(error);
    }
});

app.get('/auth/google/oauth', passport.authenticate('google-oauth',{
  scope:['email', 'profile', 'openid']
}));

app.get('/auth/google-oauth/callback',passport.authenticate("google-oauth",{session:false}),
   function (req, res, next) {
    
    if(!req.user){
       next(boom.unauthorized());
    }

    const {token, ...user} = req.user;
    
     res.cookie('token', token,{
       httpOnly:!config.dev,
       secure:!config.dev
     });

    res.status(200).json(user);
     
   }
);

app.get('/auth/google', passport.authenticate('google',{scope:["email", "profile", "openid"]}) 
);

app.get('/auth/google/callback', passport.authenticate('google',{session:false}),
    function (req, res, next) {
      if(!req.user){
         next(boom.unauthorized());
      }

      const {token, ...user} = req.user;

      res.cookie('token', token,{
        httpOnly:!config.dev,
        secure:!config.dev
      });

      res.status(200).json(user);
    }
);

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback', passport.authenticate('twitter', {session:false}), 
function (req, res, next) {
       console.log('Hellow word');
      if(!req.user){
           next(boom.unauthorized());
      }


      const { token, ...user } = req.user;
     
      res.cookie("token", token,
      {
        httpOnly:!config.dev,
        secure:!config.dev
      });

      res.status(200).json(user);
});

app.listen(config.port, function(){
    console.log(`Listening http:localhost:${config.port}`);
});