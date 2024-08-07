BASIC SETUP:
    
    - npm init

    - npm i bcryptjs cookie-parser cors express ioredis jsonwebtoken mongoose ts-node-dev @types/bcryptjs @types/cookie-parser @types/cors @types/express @types/node @types/jsonwebtoken typescript

---
- Good commit practices :-

```
    feat -> feature
    fix -> bug fix
    docs -> documentation
    style -> formatting, lint stuff
    refactor -> code restructure without changing external behavior
    test -> adding missing tests
    chore -> maintenance
    init -> initial commit
    rearrange -> files moved, added, deleted etc
    update -> update code (versions, library compatibility)
```
---


## PLAN:     
### Handle Errors and User authentication
1. Handle errors ✅
2. User model design ✅
3. User registration ✅
4. User activation ✅
5. User login ✅, logout ✅
6. User authorization (middleware _verifyJWT_)✅
7. Generate token, user socials auth ✅, get user info ✅
8. Update user info ✅, password ✅ and avatar (either using **cloudinary** or imagekit --> _May Change Later_)✅ 



### Course Model and Course Creation 
1. Course model design ✅
2. Create course ✅, edit course ✅
3. Get single and all courses --without purchasing ✅
4. Get course content, get user accessible all courses -- only for valid user ✅
5. Create question ✅, add reply in question ✅
6. Add review in course ✅


### Order and Notifications
1. Order and notification model ✅
2. Create order ✅
3. Get all notifications ✅, update notification status ✅
4. Delete read notifications -- with cron job after a certain time ✅

### Admin Dashboard
1. Get all users ✅, courses ✅, orders ✅
2. Update user role ✅
3. Delete user ✅
4. Delete course ✅
5. **Analytics** 
    - Get the last 28 days' (and for for last year)
        -  users
            - user data analytics for how many users are created in the last 28 days and how many users are created in the whole last one year
        -  orders
        -  notifications 