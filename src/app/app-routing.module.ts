import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClocksComponent } from './clocks/clocks.component';
import { ZoneHistoryComponent } from './zone-history/zone-history.component';
import { DownloadsComponent } from './downloads/downloads.component';

const routes: Routes = [
  { path: '', component: ClocksComponent },
  { path: 'clocks', component: ClocksComponent },
  { path: 'history', component: ZoneHistoryComponent },
  { path: 'downloads', component: DownloadsComponent },
  { path: '**', component: ClocksComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
