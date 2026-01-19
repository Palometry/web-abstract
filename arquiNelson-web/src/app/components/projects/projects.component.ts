import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortfolioListItem, PortfolioService } from '../../services/portfolio';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  items: PortfolioListItem[] = [];
  loading = false;

  constructor(private portfolioService: PortfolioService) {}

  async ngOnInit() {
    this.loading = true;
    this.items = await this.portfolioService.getItems();
    this.loading = false;
  }
}
