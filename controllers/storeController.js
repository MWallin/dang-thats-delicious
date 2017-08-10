const mongoose = require( "mongoose" )
const Store = mongoose.model( "Store" )
const User = mongoose.model( "User" )

const multer = require( "multer" )
const jimp = require( "jimp" )
const uuid = require( "uuid" )


const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter ( req, file, next ) {
    const isPhoto = file.mimetype.startsWith( "image/" )

    if ( isPhoto ) {
      next( null, true )
    } else {
      next({ message: "That kind of file is not allowed!"}, false )
    }
  }

}


exports.homePage = ( req, res ) => {

  res.render( "index", {
    title: "Start",
    name : req.name
  })

}


exports.addStore = ( req, res ) => {

  res.render( "editStore", {
    title: "Add store"
  })

}


exports.upload = multer( multerOptions ).single( "photo" )



exports.resize = async ( req, res, next ) => {

  if ( !req.file ) {
    return next()
  }

  // Add file name to the body
  const extension = req.file.mimetype.split( "/" )[1]
  req.body.photo = `${uuid.v4()}.${extension}`

  // Resize photo
  const photo = await jimp.read( req.file.buffer )
  await photo.resize( 800, jimp.AUTO )
  await photo.write( `./public/uploads/${req.body.photo}` )

  // Done, lets keep on going
  next()
}





exports.createStore = async ( req, res ) => {

  req.body.author = req.user._id

  const store = await ( new Store( req.body ) ).save()

  req.flash( "success", `Successfully created <strong>${store.name}</strong>. Care to leave a review?` )

  res.redirect( `/stores/${store.slug}` )

}






exports.getStores = async ( req, res ) => {

  const page = req.params.page || 1
  const limit = 6
  const skip = ( page * limit ) - limit

  const storesPromise = Store
    .find()
    .skip( skip )
    .limit( limit )
    .sort({ created: "desc"})

  const countPromise = Store.count({})


  const [stores, count] = await Promise.all( [storesPromise, countPromise] )


  const pages = Math.ceil( count / limit )



  if ( !stores.length && skip ) {
    req.flash( "info", `Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}.` )

    res.redirect( `/stores/page/${pages}` )


    return

  }



  res.render( "stores", {
    title: "Stores",
    stores,
    count,
    pages,
    page
  })

}





const confirmOwner = ( store, user ) => {

  if ( !store.author.equals( user._id ) ) {
    throw Error( "You must own a store in order to edit it!" )
  }

}





exports.editStore = async ( req, res ) => {

  const store = await Store.findById( req.params.storeId )


  confirmOwner( store, req.user )


  res.render( "editStore", {
    title: "Edit store",
    store
  })

}







exports.updateStore = async ( req, res ) => {

  req.body.location.type = "Point"

  const store = await Store.findOneAndUpdate(
    {
      _id: req.params.id
    },
    req.body,
    {
      new          : true,
      runValidators: true
    }
  ).exec()

  req.flash( "success", `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View store</a>` )

  res.redirect( `/stores/${store._id}/edit` )
}






exports.getStoreBySlug = async ( req, res, next ) => {

  const store = await Store
    .findOne({ slug: req.params.storeSlug })
    .populate( "author reviews" )

  if ( !store ) {
    return next()
  }

  res.render( "viewStore", {
    title: store.name,
    store
  })

}



exports.getStoresByTag = async ( req, res ) => {

  const tag = req.params.tag
  const tagQuery = tag || { $exists: true }

  const tagsPromise = Store.getTagsList()
  const storesPromise = Store.find({ tags: tagQuery })

  const [tags, stores] = await Promise.all( [ tagsPromise, storesPromise  ] )


  res.render( "tag", {
    title: "Tags",
    stores,
    tags,
    tag
  })

}


exports.searchStores = async ( req, res ) => {

  const stores = await Store
    // Find all matchning stores
    .find(
      {
        $text: {
          $search: req.query.q
        }
      },
      {
        score: { $meta: "textScore"}
      }
    )
    // Sort based on score
    .sort(
      {
        score: { $meta: "textScore"}
      }
    )
    // Limit to only 5 results
    .limit( 5 )


  res.json( stores )

}



exports.mapStores = async ( req, res ) => {

  const coordinates = [req.query.lng, req.query.lat].map( parseFloat )

  const dbQuery = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates
        },
        $maxDistance: 10000 // 10 km
      }
    }

  }



  const stores = await Store
    .find( dbQuery )
    .select( "slug name desciption location photo" )
    .limit( 10 )

  res.json( stores )

}




exports.mapPage = ( req, res ) => {

  res.render( "map", {
    title: "Map"
  })

}


exports.heartStore = async ( req, res ) => {

  const hearts = req.user.hearts.map( obj => obj.toString() )

  const operator = hearts.includes( req.params.storeId ) ? "$pull" : "$addToSet"

  const user = await User.findByIdAndUpdate(
    req.user._id,

    {
      [operator]: { hearts: req.params.storeId}
    },

    {
      new: true
    }
  )

  res.json( user )

}



exports.getHeartedStores = async ( req, res ) => {

  const stores = await Store.find({
    _id: {
      $in: req.user.hearts
    }
  })

  res.render( "stores", {
    title: "Hearted stores",
    stores
  })


}




exports.getTopStores = async ( req, res ) => {

  const stores = await Store.getTopStores()

  res.render( "topStores", {
    title: "Top stores",
    stores
  })

}

