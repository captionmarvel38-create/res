const express= require('express')
const app= express();

//express-session
const session= require('express-session')
app.use(session({
    secret:'mysecret123',
    resave: false,
    saveUninitialized: true 
}))


const bodyParser= require('body-parser')
app.use(bodyParser.urlencoded({extended:true}))

const mysql= require('mysql2')
const connection= mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fastfood'
})
connection.connect((err)=>{
{
    if(err){
        console.log('error occured while connecting database')
        return;
    }
        console.log('Database is Connected')
    }
})


app.set('view engine', 'ejs')
app.get('/',(req,res)=>{
    // res.render('home')
    connection.query('select * from dishes',
        (error,result)=>
        {
            if(error){
                console.log(error)}
                else{
                    
                    res.render('home', {result:result,user:req.session.user})
                }
        }
    )
})


// registeration
app.get('/register',(req,res)=>{
    
    res.render('registeration')
})

// Registeration post
app.post('/register',(req,res)=>{

    console.log(req.body)
    connection.query(`insert into user(first_name, last_name, email,phone, address, password)
    values(
        '${req.body.first_name}',
        '${req.body.last_name}',
        '${req.body.email}',
        '${req.body.phone}',
        '${req.body.city}',
        '${req.body.password}'
    )`,
    (error,result)=>{
        if(error){
            console.log(error)
        }
        else{
        console.log(result)
        res.redirect('/')
        }
    })

})


//Login
app.get('/login',(req,res)=>{
    if(!req.session.user){
        res.render('login')
    }
    else{
        res.redirect('/cart')
    }
})



// Login post
app.post('/login',(req,res)=>{
   
    console.log(req.body)

    connection.query(`select * from user where email='${req.body.email}' and password='${req.body.password}'`,
        (error,result)=>
        {
            if(error){
                console.log(error)
                res.redirect('/login')
            }
            else if(!result[0]){
                res.redirect('/login')
            }
            else{
                console.log('login successful')
                req.session.user=result[0].user_id
                res.redirect('/')
            }
        }
    )
})

//cart
app.get('/cart',(req,res)=>{
    if(!req.session.user){
        res.redirect('/login')
    }
    else{
       connection.query(`select orders.order_id,user_id,status,dishes.dish_id,dish_name,dish_price from orders,order_dishes,dishes where order_dishes.order_id=orders.order_id and order_dishes.dish_id=dishes.dish_id and orders.status="pending" and orders.user_id=${req.session.user}`,
        (error,result)=>{
            if(error){
                console.log(error)
            }
            else {
                res.render('cart',{result})
            }
        }
       )
      
    }  
})

//order
app.post('/order' ,(req,res)=>{
    console.log(req.body)
    
    connection.query(`select * from orders where user_id=${req.session.user} and status='pending'`,
        (error,result)=>{
            if(error){
                console.log(error)
            }
            else if(result.length==0){
                connection.query(`insert into orders(user_id,status) value(${req.session.user},"pending")`,
                    (error,result)=>{
                        if(error){
                            console.log(error)
                        }
                        
                        let orderId = result.insertId;
                        console.log(req.body.Dish_id)
                        connection.query(`insert into order_dishes(order_id,dish_id) values(${orderId},${req.body.Dish_id})`,
                            (error,result)=>{
                                if(error){
                                    console.log(error)
                                }
                                else{
                                    res.redirect('/cart')
                                }
                            }
                        )
                    }
                )
            }
            else{
                console.log(result)
                connection.query(`insert into order_dishes(order_id,dish_id)values(${result[0].order_id},${req.body.Dish_id})`,
                    (error,result)=>{
                       if(error){
                        console.log(error)
                       }
                       else{
                        console.log(result)
                        res.redirect('/')
                       }
                    }
                )
            }
        }
        
    )
})

//Cart Delete 
app.post('/cart/delete/:id', (req,res)=>
{
    connection.query(`delete from orders where order_id=${req.params.id}`,
        (error,result)=>{
            if(error){
                console.log(error)
            }
            else{
                res.redirect('/cart')
            }
        }
    )
})

// /cart/confirm
app.post('/cart/confirm',(req,res)=>{
    console.log(req.body)
  connection.query(`update orders set status="confirmed" where order_id=${req.body.total}`,
    (error,result)=>{
        if(error){
            console.log(error)
        }
        else{
            res.redirect('/')
        }
    }
  )
})




//My orders
app.get('/myOrders',(req,res)=>{
    if(!req.session.user){
        res.redirect('/login')
    }
    else{
         connection.query(`select orders.order_id,status from orders where orders.status="confirmed" and orders.user_id=${req.session.user}`,
        (error,result)=>{
            if(error){
                console.log(error)
            }
            else {
                console.log(result)
                res.render('myorders',{result})
            }
        }
       )
        
    }
    
})


// My Orders Cancel
app.post('/order/cancel',(req,res)=>{
   connection.query(`update orders set status="cancelled" where order_id=${req.body.orderid}`,
    (error,result)=>{
        if(error){
            console.log(error)
        }
        else{
            res.redirect('/myOrders')
        }
    }
   ) 
})


         //Dashboard
app.get('/dashboard',(req,res)=>{
  if(!req.session.user){
    res.redirect('/adminlogin')
    return
  }
   if(req.session.user!=='admin'){
    console.log('in second if')
    res.redirect('/adminlogin')
    return
  }
  
    connection.query('select o.order_id,o.status,u.first_name,u.last_name,u.phone,u.address,sum(d.dish_price) as total_amount from orders o join user u ON o.user_id=u.user_id JOIN order_dishes od ON o.order_id=od.order_id JOIN dishes d ON od.dish_id = d.dish_id group by o.order_id order by o.order_id ',
        (error,result)=>{
            if(error){
                console.log(error)      
            }
            else{
                res.render('dashboard',{result})
            }
        }
    )
    }
)

//admin
app.get('/adminlogin',(req,res)=>{
    res.render('adminlogin')
})

//Admin post
app.post('/adminlogin',(req,res)=>{
    connection.query(`select username from admin where username='${req.body.username}' and password='${req.body.password}'`,
        (error,result)=>{
            if(error){
                console.log(error)
            }
            else{
                req.session.user = result[0].username
                res.redirect('/dashboard')
            }
        }
    )
})
app.listen(5000,()=>{
    console.log("server is listening")
})