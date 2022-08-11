
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");
// const saltRounds = 12;

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const cookieParser = require("cookie-parser");
const _ = require("lodash");

const path = require('path');
const fs = require("fs");
const multer = require("multer");


const search_u = require(__dirname + "/searchbar.js"); 

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

//Encrypted Using Hash functions and Salting

app.use(session({
    secret: "Lmao ded",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '_' + Date.now() + "_" + file.originalname);
    // cb(null, new Date().toISOString() + file.originalname);
    }
  });
 
var upload = multer({ storage: storage }).single('image');

mongoose.connect("mongodb+srv://admin-bhoopesh:bjioknmlp@cluster0.s6slsoh.mongodb.net/userDB", {useNewUrlParser: true});
// mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    department: String,
    secret: String
    // img:
    // {
    //     data: Buffer,
    //     contentType: String
    // }
});

const commentSchema = new mongoose.Schema({
    comment: String,
    by: String,
    for: String,
    img:
    {
        data: Buffer,
        contentType: String
    }
});

const listSchema = new mongoose.Schema({
    name: String,
    comments: [commentSchema]
});

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Comment = new mongoose.model("Comment",commentSchema);
const List = new mongoose.model("List",listSchema);


const item1 = new Comment({
    comment: "Comment about your memories with me , Describe Me in your own words",
    by: "",
    for: "",
    img: ""
});

const defaultItems = [item1];

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/",function(req,res){
    res.render("home");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register",{already: ""});
});

app.get("/dashboard",function(req,res){
    // let user = req.user.username;
    const context = req.cookies.context;
    // res.clearCookie("context", { secure: true });
    if(req.isAuthenticated()){
        User.find({"username": {$ne: null}}, function(err,foundUsers){
            if(err){
                console.log(err);
            }
            else{
             if(foundUsers){
                res.render("dashboard", {currentuser: context, users: foundUsers});
             }
            }
        });
    }
    else{
        res.redirect("/login");
    }
    
});

app.get("/secrets", function(req,res){
    const context = req.cookies.context;
    const context1 = req.cookies.context1;

    if(req.isAuthenticated()){
        
        // User.find({name: })
        
        if(List.findOne({name: context1}, function(err,foundList){
            if(err){
                console.log(err);
            }
            if(foundList.length != 0){
                // console.log(foundList.comments);
                
                res.render("secrets",{username: context1, listItem: foundList.comments});
            }
        }));

    }
    else{
        res.redirect("/login");
    }

    // User.find({"": {$ne: null}}, function(err,foundUsers){
    //     if(err){
    //         console.log(err);
    //     }
    //     else{
    //      if(foundUsers){
    //         res.render("secrets", {usersWithSecrets: foundUsers});
    //      }
    //     }
    // });

});

app.get("/logout",function(req,res){
    req.logOut(function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/"); 
        }
    });
});

app.get("/submit", function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login");
    }
});

app.get("/photos", function(req,res){

    if(req.isAuthenticated()){
        const context = req.cookies.context;
        const context1 = req.cookies.context1;
    
        Comment.find({for: context1 , by: context}, function(err,foundList){
    
            if(err) throw err;
            else{
              res.render("photos",  { items: foundList , user: context1 } );
            }
        });
    }
    else{
        res.redirect("/login");
    }
    

});


// app.get("/users/:username",function(req,res){
//     const requestedPost = _.lowerCase(req.params.username);
//     posts.forEach(function(post){
//        if(_.lowerCase((post.title)) == requestedPost){
//          console.log("Match found");
//          res.render("post", {title:post.title, content: post.content});
//        }
//     });
//  });

app.get("/:userName",function(req,res){

    if(req.isAuthenticated()){
        const username = _.capitalize(req.params.userName);
        // commentUser = username;
    
        res.clearCookie("context1", { secure: true });
    
    
        console.log(username);
        // res.redirect("/secrets");
        // res.render("secrets",{username : commentUser});
        if(List.findOne({name: username}, function(err,foundList){
           res.cookie("context1", username, {secure: true });
            if(!err){
                if(!foundList){
                    const list = new List({
                        name : username,
                        comments: defaultItems
                    });
                    // list.save();
                    list.save(function(err){
    
                        if (!err){
                            res.redirect("/secrets");
                        }
    
                    });
                }
                else{
                    // res.render("secrets",{username: foundList.name, listItem: foundList.comments});
                    res.redirect("/secrets");
                }
    
            }
        }));
    }
    else{
        res.redirect("/login");
    }
    
});



app.post("/secrets", function(req,res){
    if(req.isAuthenticated()){

    const submittedComment = req.body.comment;

    const context =  req.cookies.context;
    const context1 = req.cookies.context1;

    const comment = new Comment({
        comment: submittedComment,
        by: context,
        for: context1 
    });

    List.findOne({name: context1}, function(err,foundList){
        foundList.comments.push(comment);
        foundList.save(function(err){
            if(!err){
                res.redirect("/secrets");
            }
        });
    });
    }
    else{
        res.redirect("/login");
    }
    // res.render("secrets", {username : commentUser});
    // User.findById(req.user.id, function(err, foundUser){
    //     if(err){
    //         console.log(err);
    //     }
    //     else{
    //         if(foundUser){
    //             foundUser.secret = submittedComment;
    //         }
    //         foundUser.save(function(){
    //             res.redirect("/secrets");
    //         });
    //     }
    // });
});

app.post("/delete", function(req,res){

    var deleteComment = req.body.com;
    var delcomm = req.body.comm;
    // var obj = JSON.parse(deleteComment);
    console.log(deleteComment);

    const context = req.cookies.context;
    const context1 = req.cookies.context1;
    

    if(context == deleteComment){
         List.findOne({name: context1}, function(err,foundList){
            foundList.comments.forEach( element =>{
               if(element.by == deleteComment && element.comment == delcomm){
                 var index = foundList.comments.indexOf(element);
                 foundList.comments.splice(index, 1);
                 foundList.save(function(err){
                    if(!err){
                        res.redirect("/secrets");
                    }
                    
                 });
               }
            });
    });
    }
    else{
         res.redirect("/secrets");

    }

    // List.findOne({name: commentUser}, function (err, foundList) {

    //         if(err){
    //            console.log(err);
    //         }else{
    //         foundList.comments.forEach( element =>{
    //            if(element.comment == deleteComment){
    //              foundList.comments.pop(element);
    //              foundList.save(function(err){
    //                 if(!err){
    //                     res.redirect("/secrets");
    //                 }
    //              });
    //            }
    //         });
    //        }
    // });

});


app.post("/uploadphoto",upload,(req,res)=>{
    var img = fs.readFileSync(req.file.path);
    var encode_img = img.toString('base64');

    const context = req.cookies.context;
    const context1 = req.cookies.context1;

    var obj = {
        comment: "",
        by: context,
        for: context1,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    };
 
    Comment.create(obj,function(err,result){
        if(err){
            console.log(err);
        }else{
            res.redirect('/photos');
            // console.log(result.img.Buffer);
            console.log("Saved To database");
            // res.contentType(final_img.contentType);
            // res.send(final_img.image);
        }
    });
});


app.post("/register", function(req,res){
    User.findOne({username: req.body.username}, function (err, foundList) {

        if(!foundList){
            User.register({username: req.body.username, department: req.body.department}, req.body.password, function(err, user){
                if(err){
                   console.log(err);
                   res.redirect("/register"); 
                }
                else{
                    passport.authenticate("local")(req,res, function(){
                        // activeUser = req.body.username;
                        res.clearCookie("context", { secure: true });
                        res.cookie("context", req.body.username, {secure: true });
                        res.redirect("/dashboard");
                    });
                }
            });
        }
        else{
            res.render("register",{already: "Username already exists"});
        }

    });
   
        

});

app.post("/login", function(req,res){
    

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
          console.log(err);  
        }
        else{
            passport.authenticate("local")(req,res, function(){
                // activeUser = req.body.username;
                res.clearCookie("context", { secure: true });
                res.cookie("context", req.body.username, { secure: true });
                res.redirect("/dashboard");

            });
        }
    });

});




let port = process.env.PORT;

if (port==null || port==""){
    port=3000;
}

app.listen(port, function(){
    console.log("Server started successfully");
});





