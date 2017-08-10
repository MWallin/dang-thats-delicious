
const mongoose = require( "mongoose" )
mongoose.Promise = global.Promise

const slug = require( "slugs" )


const storeSchema = new mongoose.Schema({

  name: {
    type    : String,
    trim    : true,
    required: "Please enter a store name!"
  },

  slug: String,

  description: {
    type: String,
    trim: true
  },

  tags: [String],

  created: {
    type   : Date,
    default: Date.now
  },

  updated: {
    type   : Date,
    default: Date.now
  },

  location: {
    type: {
      type   : String,
      default: "Point"
    },
    coordinates: [{
      type    : Number,
      required: "You must supply coordinates!",
    }],
    address: {
      type    : String,
      required: "You must supply an address"
    }
  },

  photo: String,

  author: {
    type    : mongoose.Schema.ObjectId,
    ref     : "User",
    required: "You must supply an author!"
  }

}, {
  toJSON  : { virtuals: true },
  toObject: { virtuals: true}
})


storeSchema.index({
  name       : "text",
  description: "text"
})

storeSchema.index({
  location: "2dsphere"
})




function autopopulate ( next ) {

  this.populate( "reviews" )

  next()

}


storeSchema.pre( "find", autopopulate )
storeSchema.pre( "findOne", autopopulate )






storeSchema.pre( "save", async function ( next ) {

  if ( !this.isModified( "name" ) ) {
    return next()
  }

  this.slug = slug( this.name )


  // TODO: Make slugification unique
  const slugRegEx = new RegExp( `^(${this.slug})((-[0-9]*$)?)$`, "i" )
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx })

  if ( storesWithSlug.length ) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`
  }


  next()

})


// on every save, add the date
storeSchema.pre( "save", function ( next ) {
  // get the current date
  const currentDate = new Date()

  // change the updated_at field to current date
  this.updated = currentDate

  // if created_at doesn't exist, add to that field
  if ( !this.created ) {
    this.created = currentDate
  }

  next()

})



storeSchema.statics.getTagsList = function () {

  return this.aggregate( [
    {
      $unwind: "$tags"
    },

    {
      $group: {
        _id  : "$tags",
        count: { $sum: 1 }
      }
    },

    {
      $sort: { count: -1 }
    }

  ] )

}



storeSchema.statics.getTopStores = function () {

  return this.aggregate( [
    // 1. Lookup stores and populate ther review
    {
      $lookup: {
        from        : "reviews",
        localField  : "_id",
        foreignField: "store",
        as          : "reviews"}
    },
    // 2. Filter for only items that have 2 or more reviews
    {
      $match: {
        "reviews.1": {
          $exists: true
        }
      }
    },
    // 3. Add the average reviews field
    {
      $project: {
        photo  : "$$ROOT.photo",
        name   : "$$ROOT.name",
        slug   : "$$ROOT.slug",
        reviews: {
          $size: "$reviews"
        },
        averageRating: {
          $avg: "$reviews.rating"
        }
      }
    },
    // 4. Sort it b our new field, highet review first
    {
      $sort: {
        averageRating: -1
      }
    },
    // 5. Limit to 10 stores
    {
      $limit: 10
    }

  ] )




}





storeSchema.virtual( "reviews", {
  ref         : "Review",
  localField  : "_id",
  foreignField: "store"
})




module.exports = mongoose.model( "Store", storeSchema )
