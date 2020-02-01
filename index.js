const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const cookieParser = require('cookie-parser');
const axios = require('axios');

const { config } = require('./config');

const app = express();

// Body parser
app.use(express.json());
app.use(cookieParser());

require('./utils/auth.js/strategies/basic');

app.post("/auth/sign-in", async function(req, res, next) {
  passport.authenticate("basic", function(error, data) {
    try {
      if (error || !data) {
        next(boom.unauthorized());
      }

      req.login(data, { session: false }, async function(error) {
        if (error) {
          next(error);
        }

        const { token, ...user } = data;

        res.cookie("token", token, {
          httpOnly: !config.dev,
          secure: !config.dev
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

app.listen(config.port, function(){
    console.log(`Listening http:localhost:${config.port}`);
});