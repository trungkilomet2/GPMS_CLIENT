import { lazy } from "react";
import CustomerLayout from "@/components/layout/CustomerLayout";

const Orders = lazy(()=>import("../pages/orders/OrdersList"));
const ViewProfile = lazy(()=>import("../pages/profile/ViewProfile"));
const ProfileEdit = lazy(()=>import("../pages/profile/ProfileEdit"));

export const routes = [

{
 path:"/",
 element:<Orders/>
},

{
 path:"/orders",
 element:<Orders/>
},

{
 path:"/profile",
 element:(
   <CustomerLayout title="Hồ sơ cá nhân">
     <ViewProfile/>
   </CustomerLayout>
 )
},

{
 path:"/profile/edit",
 element:(
   <CustomerLayout title="Chỉnh sửa hồ sơ">
     <ProfileEdit/>
   </CustomerLayout>
 )
},

{
 path:"*",
 element:<div>404</div>
}

];