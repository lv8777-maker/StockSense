import { Switch, Route } from "wouter";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import Rewards from "@/pages/rewards";
import History from "@/pages/history";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";

export default function Home() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/rewards" component={Rewards} />
        <Route path="/history" component={History} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />
      </Switch>
    </Layout>
  );
}
