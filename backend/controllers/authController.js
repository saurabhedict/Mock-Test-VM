const User = require("../models/user")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

// REGISTER USER
exports.register = async (req,res) => {

 try {

  const {name,email,password} = req.body

  // check if user already exists
  const existingUser = await User.findOne({email})

  if(existingUser){
    return res.status(400).json({msg:"User already exists"})
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password,10)

  // create user
  const user = await User.create({
    name,
    email,
    password:hashedPassword
  })

  res.json({
    message:"User registered successfully",
    user
  })

 } catch(err){

  console.error(err)
  res.status(500).json({msg:"Server error"})

 }

}



// LOGIN USER
exports.login = async (req,res)=>{

 try{

  const {email,password} = req.body

  const user = await User.findOne({email})

  if(!user){
    return res.status(404).json({msg:"User not found"})
  }

  const valid = await bcrypt.compare(password,user.password)

  if(!valid){
    return res.status(400).json({msg:"Invalid password"})
  }

  const token = jwt.sign(
    {id:user._id},
    process.env.JWT_SECRET,
    {expiresIn:"7d"}
  )

  res.json({
    message:"Login successful",
    token,
    user
  })

 }catch(err){

  console.error(err)
  res.status(500).json({msg:"Server error"})

 }

}