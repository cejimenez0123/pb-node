import history from "../history"
import store from '../index'
import axios from 'axios'
export {signUp,LOG_IN}
const userPath = "http://127.0.0.1:3000/users"


function useUserActions(){
    return {signUp: (user)=>signUp(user),
    }
}
function SIGN_UP_START(){
    return {
    type: "SIGN_UP_START"}
}

function signUp(user) { 
   
    let config={
        method: 'post',
        url: '/users',
        timeout: 4000,    // 4 seconds timeout
        data: user}
   return(dispatch)=>{
       dispatch(SIGN_UP_START())
    axios(config)
      .then(res => {
          debugger
          if(res.status===200){
              let user=res.data
              
              localStorage.setItem("currentUser",res.data.id)
              localStorage.setItem("loggedIn","true")
              history.push(`/users/${user.username}`)
              dispatch({type: 'SIGN_UP',user})
          }}
      )
      .catch(error => console.log(error))
        
    
}}



function LOG_IN_START(){
    return{
        type: "LOG_IN_START"
    }
}
const LOG_IN = (user)=>{
debugger
    let config={ 
        url: '/users/login',
        timeout: 4000,    // 4 seconds timeout
        data: user}
    return ((dispatch)=>{
        dispatch(LOG_IN_START);
       
        
        axios(config)
          .then(res => {
              debugger
              if(res.status===200){

              }
            res.json()})
          .catch(error => console.log(error))})
}
// const SET_CURRENT_USER=()=>{
//     let id = localStorage.getItem("currentUser")

//   return ((dispatch)=>{
//       dispatch({type:"START_SET_CURRENT_USER"})
//       fetch(userPath+"/"+id).then(res=>res.json()).then(user=>{
//         dispatch({ type: "SET_CURRENT_USER",user})})
    
        
//     })
// }
// const END_CURRENT_USER=()=>{
// return(dispatch)=>{
//     dispatch({type:"END_CURRENT_USER"})}
// }
// const shareWith=(user,content)=>{

//     let config = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Accept': 'application/json'
//             },
//             body: JSON.stringify({
//                 user_id: user,
//                 content_id: content 
//             })}
//     }
// function getUsers(){
//   return(dispatch)=>{  fetch(userPath).then(res=>res.json()).then(users=>{
 
//       users=users.data
//     dispatch({type: "GET_USERS",users})
//     })}

