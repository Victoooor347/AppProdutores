import { createBottomTabNavigator,  } from "@react-navigation/bottom-tabs";
import Dashboard from "../pages/dashboard";
import Relatorios from "../pages/relatorios";
import ContraNotas from "../pages/contraNotas";
import User from "../pages/users";
import CustomTabBar from "../components/CustomTabBar";

export default function BottomRoutes() {
    const Tab = createBottomTabNavigator();

    return (
        <Tab.Navigator
            screenOptions={{headerShown:false}}
            tabBar={props=><CustomTabBar {...props}/>}
            >    
            <Tab.Screen
                name="Dashboard" 
                component={Dashboard} 
            />
            <Tab.Screen 
                name="Relatorios" 
                component={Relatorios} 
            />
            <Tab.Screen 
                name="ContraNotas" 
                component={ContraNotas} 
            />
            <Tab.Screen 
                name="User" 
                component={User} 
            />
        </Tab.Navigator> 
    )
}