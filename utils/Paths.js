
const Paths ={
    newsletter:()=>`/newsletter`,
    feedback:()=>`/feedback`,
    links:()=>`/links`,
    calendar:()=>"/events",
    dashboard:"/dashboard",
    onboard:"/onboard",
    library: {
        route: ()=>`/library/:id`,
        createRoute:(id)=>{return `/library/${id}`;}},
    page:{ route: ()=>`/story/:id/view`,createRoute:(id)=>{return `/story/${id}/view`
    }},
    workshop:{
        route:()=>"/workshop/page/:storyId",
        reader:()=>"/workshop",
        createRoute:(pageId)=>{return "/workshop/page/"+pageId}
    },
    hashtag:{
        route:()=>"/hashtag/:id",
        createRoute:(id)=>`/hashtag/${id}`
    },
    editCollection:{
        route: ()=>`/collection/:id/edit`,
        createRoute:(id)=>{return `/collection/${id}/edit`;}},
    
    apply:()=>{return "/apply"},
    book: {
        route: ()=>{return `/book/:id`;},
        createRoute:(id)=>{return `/book/${id}`
    } },
    collection:{
        route: ()=>{return '/collection/:id/view'},
        createRoute:(id)=>{return "/collection/"+id+"/view"}
    },
    editor:
    {
        text:`/story/text/edit`,
        link:`/story/link/edit`,
        image:`/story/image/edit`  
    },
    login: `/login`,
    editPage:{route:`/story/:id/editor`,
        createRoute:(id)=>{return `/story/${id}/editor`}},

    addToCollection:{
        route:'/collection/:id/add',
        createRoute:(id)=>{return `/collection/${id}/add`}},
    createCollection:{
        route:()=>{return "/collection"}
    },
    addStoryToCollection:{
        collection:(id)=>`/item/${id}/collection`,
        story:(id)=>`/item/${id}/story`,
               route:"/item/:id/:type",
        createRoute:(id)=>{
            return `/item/${id}/collection`
        }
    },
    discovery:"/discovery",
    home:`/home`,
    about:()=>{return `/about`},
    editProfile:`/profile/edit`,
    profile:{route:()=>{return `/profile/:id/view`},
            createRoute:(id)=>{return `/profile/${id}/view`}},
    myProfile:`/profile`,
    notifications:()=>{return"/profile/alert"}
}
module.exports = Paths