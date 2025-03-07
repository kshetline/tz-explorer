import { enableProdMode, importProvidersFrom } from '@angular/core';

import { environment } from './environments/environment';
import { initTimezoneLarge } from '@tubular/time';
import { themeProvider } from './app/mytheme';
import { AppService } from './app/app.service';
import { HttpTimePoller } from './app/http-time-poller/http-time-poller';
import { TzExplorerApi } from './app/api/api';
import { provideHttpClient, withInterceptorsFromDi, withJsonpSupport } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TubularNgWidgetsModule } from '@tubular/ng-widgets';
import { AppComponent } from './app/app.component';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { ClocksComponent } from './app/clocks/clocks.component';
import { ZoneHistoryComponent } from './app/zone-history/zone-history.component';
import { DownloadsComponent } from './app/downloads/downloads.component';
import { CodeComponent } from './app/code/code.component';

if (environment.production) {
  enableProdMode();
}

initTimezoneLarge();

const routes: Routes = [
  { path: '', component: ClocksComponent },
  { path: 'clocks', component: ClocksComponent },
  { path: 'history', component: ZoneHistoryComponent },
  { path: 'downloads', component: DownloadsComponent },
  { path: 'code', component: CodeComponent },
  { path: '**', component: ClocksComponent }
];

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(TubularNgWidgetsModule),
    provideRouter(routes),
    themeProvider,
    AppService,
    HttpTimePoller,
    TzExplorerApi,
    provideHttpClient(withInterceptorsFromDi(), withJsonpSupport()),
    provideAnimations()
  ]
})
  .catch(err => console.error(err));
