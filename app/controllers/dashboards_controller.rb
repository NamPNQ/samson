class DashboardsController < ApplicationController
  def show
    @environment = Environment.find(params[:id])
    @deploys = Project.alphabetical.with_deploy_groups.each_with_object({}) do |project, hash|
      hash[project] = project.last_deploy_by_group
      hash[project].select! { |id, _v| @environment.deploy_group_ids.include?(id) }
    end
  end
end
