
const Paths ={
    subscribe:"/subscribe",
    newsletter:()=>`/newsletter`,
    feedback:()=>`/feedback`,
    links:()=>`/links`,
    calendar:()=>"/events",
    library: {
        route: ()=>`/library/:id`,
        createRoute:(id)=>{return `/library/${id}`;}},
    page:{ route: ()=>`/story/:id`,createRoute:(id)=>{return `/story/${id}`
    }},
  
    workshop:{
        route:()=>"/workshop/page/:pageId",
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
        route: ()=>{return '/collection/:id'},
        createRoute:(id)=>{return "/collection/"+id}
    },
    editor:{
        text:()=>{return `/story/text`},
        link:()=>{ return `/story/link`},
        image:()=>{return `/page/image`}   
    },
    login:()=>{return `/login`},
    editPage:{route:()=>{return `/story/:id/edit`},
        createRoute:(id)=>{return `/story/${id}/edit`}},

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
    discovery:()=>"/discovery",
    home:()=>{return `/home`},
    about:()=>{return `/`},
    profile:{route:()=>{return `/profile/:id`},
            createRoute:(id)=>{return `/profile/${id}`}},
    myProfile:()=>{return `/profile/home`},
    notifications:()=>{return"/profile/alert"}
}
export default Paths