const express = require( "express" )
const router = express.Router()

const { catchErrors } = require( "../handlers/errorHandlers" )

const storeController = require( "../controllers/storeController" )
const userController = require( "../controllers/userController" )
const authController = require( "../controllers/authController" )
const reviewController = require( "../controllers/reviewController" )

// Do work here
router.get( "/", catchErrors( storeController.getStores ) )
router.get( "/stores", catchErrors( storeController.getStores ) )

router.get( "/stores/page/:page", catchErrors( storeController.getStores ) )




router.get( "/stores/:storeSlug", catchErrors( storeController.getStoreBySlug ) )


router.get( "/add",
  authController.isLoggedIn,
  storeController.addStore
)

router.post( "/add",
  storeController.upload,
  catchErrors( storeController.resize ),
  catchErrors( storeController.createStore )
)

router.post( "/add/:id",
  storeController.upload,
  catchErrors( storeController.resize ),
  catchErrors( storeController.updateStore )
)

router.get( "/stores/:storeId/edit", catchErrors( storeController.editStore ) )

router.get( "/tags", catchErrors( storeController.getStoresByTag ) )
router.get( "/tags/:tag", catchErrors( storeController.getStoresByTag ) )


router.get( "/login", userController.loginForm )
router.post( "/login", authController.login )

router.get( "/register", userController.registerForm )

router.post( "/register",
  // 1. Validate the registration data
  userController.validateRegister,
  // 2. Register the user
  catchErrors( userController.register ),
  // 3. Log in the user
  authController.login
)

router.get( "/logout", authController.logout )


router.get( "/account", authController.isLoggedIn, userController.account )
router.post( "/account", catchErrors( userController.updateAccount ) )

router.post( "/account/forgot", catchErrors( authController.forgot ) )

router.get( "/account/reset/:token", catchErrors( authController.reset ) )
router.post( "/account/reset/:token",
  authController.confirmPasswords,
  catchErrors( authController.updatePassword )
)


router.get( "/map", storeController.mapPage )

router.get( "/hearts",
  authController.isLoggedIn,
  catchErrors( storeController.getHeartedStores )
)

router.post( "/reviews/:storeId",
  authController.isLoggedIn,
  catchErrors( reviewController.addReivew )
)

router.get( "/top", catchErrors( storeController.getTopStores ) )


// API

router.get( "/api/search", catchErrors( storeController.searchStores ) )
router.get( "/api/stores/near", catchErrors( storeController.mapStores ) )
router.post( "/api/stores/:storeId/heart", catchErrors( storeController.heartStore ) )


module.exports = router